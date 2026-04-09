<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import symbolSvg from '$logos/symbol/symbol-white.svg?raw';
	import { calculate, PRIMARY_MODELS, ALL_MODELS, GPU_OPTIONS, PRECISION_OPTIONS, MODEL_DATABASE, type ApiModel, type GpuSpec, type Precision, type ModelEntry } from '$lib/cost-engine';
	import Fuse from 'fuse.js';

	function autoFocus(node: HTMLInputElement) { node.focus(); node.select(); }
	function clickOutside(node: HTMLElement, callback: () => void) {
		function handle(e: MouseEvent) { if (!node.contains(e.target as Node)) callback(); }
		document.addEventListener('click', handle, true);
		return { destroy() { document.removeEventListener('click', handle, true); } };
	}

	// UI-only state
	let showOther = $state(false);
	let hoveredModelId = $state('');
	let hoveredParamsB = $state<number | null>(null);
	let modelQuery = $state('');
	let comboOpen = $state(false);
	let comboInputEl = $state<HTMLInputElement>();
	const modelFuse = new Fuse(MODEL_DATABASE, { keys: ['name', 'vendor'], threshold: 0.4, distance: 100 });
	const filteredModels = $derived(modelQuery.length >= 2
		? modelFuse.search(modelQuery).map(r => r.item)
		: [...MODEL_DATABASE.filter(m => m.primary), ...MODEL_DATABASE.filter(m => !m.primary)]
	);
	let editingGpuCount = $state(false);
	let gpuCountInputVal = $state('');
	let hoveredPrecision = $state<Precision | null>(null);
	let hoveredGpu = $state<GpuSpec | null>(null);
	let activeHelp = $state<string | null>(null);

	function toggleHelp(id: string) { activeHelp = activeHelp === id ? null : id; }
	let triggerSpin: (() => void) | null = null;

	// URL-synced state (safe for SSR: defaults when not in browser)
	const params = $derived(browser ? $page.url.searchParams : new URLSearchParams());
	const selectedApiModelId = $derived(params.get('model') ?? '');
	const callsPerMonth = $derived(Number(params.get('calls')) || 0);
	const tokensPerCall = $derived(Number(params.get('tpc')) || 0);
	const hasCallsMode = $derived(!!params.get('calls') && !!params.get('tpc'));
	const monthlyTokens = $derived(hasCallsMode ? callsPerMonth * tokensPerCall : (Number(params.get('tok')) || 100_000_000_000));
	const specialistName = $derived(params.get('specialist') ?? '');
	const specialist = $derived(MODEL_DATABASE.find(m => m.name === specialistName) ?? null);
	const stepParam = $derived(params.get('step') ?? '');

	const STEPS = ['model', 'specialist', 'workload', 'gpu', 'report'] as const;
	type Step = typeof STEPS[number];

	const step = $derived<Step>(
		stepParam === 'report' ? 'report'
		: stepParam === 'gpu' || stepParam === 'gpus' ? 'gpu'
		: stepParam === 'workload' || stepParam === 'tokens' || stepParam === 'ratio' || stepParam === 'done' ? 'workload'
		: stepParam === 'precision' ? (specialist ? 'gpu' : 'model')
		: stepParam === 'specialist' || stepParam === 'size' ? (selectedApiModelId ? 'specialist' : 'model')
		: 'model'
	);

	// Stamp defaults into URL when arriving at a step
	$effect(() => {
		if (step === 'workload' && !params.get('calls')) replaceParams({ calls: '10000000', tpc: '4000', tok: String(10000000 * 4000), ratio: '85' });
		if (step === 'gpu' && !params.get('gpu')) replaceParams({ gpu: GPU_OPTIONS[0].id });
		if (step === 'gpu' && !params.get('prec')) replaceParams({ prec: 'fp8' });
	});

	// A step is reachable if its param exists in the URL
	const stepReachable = $derived.by(() => ({
		model: true,
		specialist: !!selectedApiModelId,
		workload: !!specialistName,
		gpu: !!params.get('tok'),
		report: !!params.get('gpu'),
	}));

	function nextStep() {
		const i = STEPS.indexOf(step);
		if (i < STEPS.length - 1) pushParams({ step: STEPS[i + 1] });
	}
	function prevStep() {
		const i = STEPS.indexOf(step);
		if (i > 0) pushParams({ step: STEPS[i - 1] });
	}

	const inputRatio = $derived(Number(params.get('ratio')) || 75);
	const precision = $derived<Precision>((params.get('prec') as Precision) || 'fp8');
	const efficiency = $derived(Number(params.get('eff')) || 20);
	const selectedGpu = $derived(GPU_OPTIONS.find(g => g.id === params.get('gpu')) ?? GPU_OPTIONS[0]);
	const gpuCountMode = $derived<'auto' | 'manual'>(params.get('gpus') ? 'manual' : 'auto');
	const gpuCountManual = $derived(Number(params.get('gpus')) || 1);

	// Calls per month: snap-point slider, 1M to 10B
	const CALLS_STOPS: number[] = [];
	for (const exp of [6, 7, 8, 9, 10]) {
		const base = Math.pow(10, exp);
		CALLS_STOPS.push(base, base * 2.5, base * 5);
	}
	const CALLS_SNAPS = CALLS_STOPS.filter((v) => v >= 1e6 && v <= 10e9);

	function sliderToCalls(v: number): number {
		const idx = Math.round(v);
		return CALLS_SNAPS[Math.min(idx, CALLS_SNAPS.length - 1)];
	}
	function callsToSlider(c: number): number {
		let closest = 0;
		let minDist = Infinity;
		for (let i = 0; i < CALLS_SNAPS.length; i++) {
			const dist = Math.abs(Math.log10(c) - Math.log10(CALLS_SNAPS[i]));
			if (dist < minDist) { minDist = dist; closest = i; }
		}
		return closest;
	}
	let callsSlider = $state(callsToSlider(10_000_000));
	$effect(() => { if (callsPerMonth > 0) callsSlider = callsToSlider(callsPerMonth); });

	const TASK_PRESETS = [
		{ label: 'classification', tpc: 500, ratio: 95 },
		{ label: 'chat', tpc: 2000, ratio: 80 },
		{ label: 'RAG', tpc: 4000, ratio: 85 },
		{ label: 'summarization', tpc: 5000, ratio: 90 },
	] as const;
	const activeTask = $derived(TASK_PRESETS.find(p => p.tpc === tokensPerCall && p.ratio === inputRatio) ?? null);

	function selectTask(preset: typeof TASK_PRESETS[number]) {
		const calls = callsPerMonth || 10000000;
		replaceParams({ calls: String(calls), tpc: String(preset.tpc), tok: String(calls * preset.tpc), ratio: String(preset.ratio) });
	}

	// Tokens per call: snap-point slider, 50 to 100K
	const TPC_STOPS: number[] = [50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000, 8000, 16000, 32000, 64000, 100000];
	function sliderToTpc(v: number): number {
		const idx = Math.round(v);
		return TPC_STOPS[Math.min(idx, TPC_STOPS.length - 1)];
	}
	function tpcToSlider(t: number): number {
		let closest = 0;
		let minDist = Infinity;
		for (let i = 0; i < TPC_STOPS.length; i++) {
			const dist = Math.abs(Math.log10(t) - Math.log10(TPC_STOPS[i]));
			if (dist < minDist) { minDist = dist; closest = i; }
		}
		return closest;
	}
	let tpcSlider = $state(tpcToSlider(4000));
	$effect(() => { if (tokensPerCall > 0) tpcSlider = tpcToSlider(tokensPerCall); });
	let showMoreGpuOptions = $state(false);
	$effect(() => { step; showOther = false; showMoreGpuOptions = false; modelQuery = ''; comboOpen = false; });

	// Vendor logo SVG paths (monochrome, fill-based)
	const VENDOR_LOGOS: Record<string, { viewBox: string; d: string }> = {
		openai: {
			viewBox: '0 0 256 260',
			d: 'M239.184 106.203C245.054 88.524 243.022 69.173 233.608 53.1C219.452 28.459 191 15.784 163.213 21.74C147.554 4.321 123.795-3.424 100.879 1.419C77.963 6.261 59.369 22.957 52.096 45.221C33.844 48.964 18.09 60.393 8.867 76.582C-5.443 101.183-2.195 132.215 16.899 153.32C11.006 170.991 13.02 190.344 22.424 206.423C36.598 231.072 65.068 243.747 92.87 237.783C105.236 251.708 123.001 259.631 141.624 259.527C170.105 259.552 195.338 241.166 204.038 214.046C222.287 210.296 238.038 198.87 247.267 182.685C261.404 158.128 258.142 127.263 239.184 106.203ZM141.624 242.541C130.256 242.559 119.244 238.575 110.519 231.286L112.054 230.416L163.725 200.591C166.341 199.056 167.954 196.257 167.971 193.224V120.374L189.816 133.01C190.034 133.121 190.186 133.331 190.225 133.573V193.94C190.169 220.758 168.442 242.485 141.624 242.541ZM37.158 197.931C31.456 188.086 29.409 176.547 31.377 165.342L32.911 166.263L84.633 196.089C87.239 197.618 90.468 197.618 93.074 196.089L156.255 159.664V184.885C156.244 185.15 156.112 185.395 155.897 185.55L103.562 215.734C80.305 229.132 50.592 221.165 37.158 197.931ZM23.549 85.381C29.29 75.473 38.351 67.916 49.129 64.048V125.439C49.089 128.459 50.697 131.263 53.324 132.754L116.198 169.026L94.353 181.662C94.113 181.789 93.826 181.789 93.586 181.662L41.353 151.53C18.142 138.076 10.182 108.386 23.549 85.125ZM203.015 127.076L139.936 90.446L161.729 77.861C161.969 77.733 162.257 77.733 162.497 77.861L214.73 108.045C231.032 117.452 240.437 135.426 238.872 154.183C237.306 172.939 225.051 189.106 207.414 195.68V134.289C207.323 131.277 205.651 128.536 203.015 127.076ZM224.757 94.385L223.222 93.464L171.603 63.383C168.981 61.844 165.732 61.844 163.111 63.383L99.981 99.808V74.587C99.953 74.325 100.071 74.07 100.288 73.922L152.521 43.789C168.863 34.374 189.174 35.253 204.643 46.043C220.111 56.834 227.949 75.592 224.757 94.18ZM88.061 139.098L66.216 126.513C65.995 126.379 65.845 126.154 65.807 125.899V65.685C65.831 46.829 76.75 29.685 93.827 21.688C110.904 13.692 131.064 16.284 145.563 28.339L144.028 29.209L92.358 59.034C89.742 60.569 88.128 63.368 88.112 66.401ZM99.929 113.519L128.067 97.301L156.255 113.519V145.953L128.169 162.171L99.981 145.953Z'
		},
		anthropic: {
			viewBox: '0 0 24 24',
			d: 'M17.304 3.541h-3.672l6.696 16.918H24Zm-10.608 0L0 20.459h3.744l1.369-3.553h7.005l1.37 3.553h3.744L10.536 3.541Zm-.371 10.223 2.291-5.946 2.292 5.946Z'
		},
		google: {
			viewBox: '0 0 24 24',
			d: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
		}
	};

	// Active model for visualization: hovered model takes priority
	const activeModelId = $derived(hoveredModelId || selectedApiModelId);
	const apiModel = $derived(ALL_MODELS.find((m) => m.id === activeModelId));
	const activeVendor = $derived(apiModel ? apiModel.provider.toLowerCase() : '');
	const activeLogo = $derived(VENDOR_LOGOS[activeVendor] ?? null);
	const activeSpecialist = $derived(hoveredParamsB ? MODEL_DATABASE.find(m => m.activeParamsB === hoveredParamsB) ?? specialist : specialist);
	const activeParamsB = $derived(activeSpecialist?.activeParamsB ?? 8);
	const activeTotalParamsB = $derived(activeSpecialist?.totalParamsB ?? activeParamsB);
	const activeSizeLabel = $derived(activeSpecialist?.name ?? '');

	// URL helpers
	function pushParams(updates: Record<string, string>) {
		const url = new URL($page.url);
		for (const [k, v] of Object.entries(updates)) {
			if (v) url.searchParams.set(k, v);
			else url.searchParams.delete(k);
		}
		goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
	}

	function replaceParams(updates: Record<string, string>) {
		const url = new URL($page.url);
		for (const [k, v] of Object.entries(updates)) {
			if (v) url.searchParams.set(k, v);
			else url.searchParams.delete(k);
		}
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	// === Shape generation ===

	// Generalist: sharp static hexagon (flat-bottom: rotate 30deg so edge sits on ground)
	const HEX_ROT = Math.PI / 6; // 30 degrees
	function sharpHexPath(r: number, cx: number, cy: number): string {
		const pts: string[] = [];
		for (let i = 0; i < 6; i++) {
			const angle = (Math.PI / 3) * i - Math.PI / 2 + HEX_ROT;
			pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
		}
		return `M ${pts.join(' L ')} Z`;
	}

	// Specialist: morph between rounded hex (t=0) and circle (t=1)
	// Uses proper cubic bezier circle approximation (kappa = 0.5522847498)
	// At t=0: control points sit on hex edges (straight). At t=1: control points
	// pull outward to form a perfect circle via the standard 4-point-per-arc method.
	const KAPPA = 0.5522847498;
	function morphPath(t: number, r: number, cx: number, cy: number): string {
		const segments: string[] = [];
		for (let i = 0; i < 6; i++) {
			const a1 = (Math.PI / 3) * i - Math.PI / 2;
			const a2 = (Math.PI / 3) * ((i + 1) % 6) - Math.PI / 2;
			const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
			const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
			// For a circle, each 60° arc needs control points at distance kappa*r
			// along the tangent at each endpoint
			const tan1x = -Math.sin(a1), tan1y = Math.cos(a1);
			const tan2x = Math.sin(a2), tan2y = -Math.cos(a2);
			// Arc length factor for 60° segment
			const k = KAPPA * r * (2 * Math.sin(Math.PI / 6));
			// Interpolate: t=0 -> control points on the straight edge, t=1 -> circle arc
			const straightCx1 = (x1 * 2 + x2) / 3;
			const straightCy1 = (y1 * 2 + y2) / 3;
			const straightCx2 = (x1 + x2 * 2) / 3;
			const straightCy2 = (y1 + y2 * 2) / 3;
			const circleCx1 = x1 + tan1x * k;
			const circleCy1 = y1 + tan1y * k;
			const circleCx2 = x2 + tan2x * k;
			const circleCy2 = y2 + tan2y * k;
			const c1x = straightCx1 + (circleCx1 - straightCx1) * t;
			const c1y = straightCy1 + (circleCy1 - straightCy1) * t;
			const c2x = straightCx2 + (circleCx2 - straightCx2) * t;
			const c2y = straightCy2 + (circleCy2 - straightCy2) * t;
			if (i === 0) segments.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)}`);
			segments.push(`C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`);
		}
		segments.push('Z');
		return segments.join(' ');
	}

	const GEN_R = 40;
	const SPEC_R = 24;
	// Generalist: flat bottom sits on ground
	const GEN_CY = 100 - GEN_R;
	// Specialist: center matches generalist center in viewBox
	const SPEC_CX = 50;
	const SPEC_CY = 60;
	const generalistPath = $derived(sharpHexPath(GEN_R, 50, GEN_CY));

	// Continuous sinusoidal morph + spin for the specialist
	let specRotation = $state(0);
	let specPathLive = $state(morphPath(0, SPEC_R, SPEC_CX, SPEC_CY));

	onMount(() => {
		let frame: number;
		const start = performance.now();
		let lastSpinTime = 0;
		let spinning = false;
		let spinStart = 0;
		let spinDuration = 0.8;
		let spinFrom = 0;
		let spinTo = 0;
		let pendingSpin = false;

		triggerSpin = () => { pendingSpin = true; };

		function tick() {
			const elapsed = (performance.now() - start) / 1000;

			// Oscillate between rounded hex (0.5) and circle (1.0)
			const morphT = 0.75 + 0.25 * Math.sin(elapsed * Math.PI / 3);
			specPathLive = morphPath(morphT, SPEC_R, SPEC_CX, SPEC_CY);

			// Spin: triggered externally or roughly every 5-8 seconds
			if (!spinning && (pendingSpin || elapsed - lastSpinTime > 5 + Math.random() * 3)) {
				spinning = true;
				pendingSpin = false;
				spinStart = elapsed;
				spinFrom = specRotation;
				spinTo = spinFrom + (Math.random() > 0.5 ? 360 : -360);
				spinDuration = 0.6 + Math.random() * 0.4;
			}

			if (spinning) {
				const p = Math.min(1, (elapsed - spinStart) / spinDuration);
				// Ease out cubic
				const ease = 1 - Math.pow(1 - p, 3);
				specRotation = spinFrom + (spinTo - spinFrom) * ease;
				if (p >= 1) {
					spinning = false;
					lastSpinTime = elapsed;
					specRotation = spinTo % 360;
				}
			}

			frame = requestAnimationFrame(tick);
		}
		frame = requestAnimationFrame(tick);
		return () => { cancelAnimationFrame(frame); triggerSpin = null; };
	});

	const genActive = $derived(!!hoveredModelId || !!selectedApiModelId);
	const specActive = $derived(!!hoveredParamsB || ((step === 'specialist' || step === 'workload' || step === 'gpu' || step === 'report') && !!specialistName));

	// Scale shapes by cost/size. Log scale for perceptual linearity.
	// Generalist: blended $/1M → scale 0.7–1.2
	const genScale = $derived.by(() => {
		if (!apiModel) return 1;
		const blended = (apiModel.inputPer1M + apiModel.outputPer1M) / 2;
		const minCost = 0.3, maxCost = 15;
		const t = Math.log(Math.max(blended, minCost) / minCost) / Math.log(maxCost / minCost);
		return 0.7 + Math.min(t, 1) * 0.5;
	});
	// Specialist: paramsB → scale 1.0–1.5
	const specScale = $derived.by(() => {
		const minP = 4, maxP = 405;
		const t = Math.log(Math.max(activeParamsB, minP) / minP) / Math.log(maxP / minP);
		return 1.0 + Math.min(t, 1) * 0.5;
	});

	const activePrecision = $derived(hoveredPrecision ?? precision);
	const activeGpu = $derived(hoveredGpu ?? selectedGpu);
	const results = $derived(
		apiModel
			? calculate({ monthlyTokens, apiModel, activeParamsB, totalParamsB: activeTotalParamsB, inputRatio: inputRatio / 100, tokensPerCall: tokensPerCall || 4000, gpu: activeGpu, gpuCountOverride: gpuCountMode === 'manual' ? gpuCountManual : null, precision: activePrecision, efficiency: efficiency / 100 })
			: null
	);

	function formatUsd(n: number): string {
		if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 100) return `$${Math.round(n).toLocaleString()}`;
		if (n >= 0.01) return `$${n.toFixed(2)}`;
		if (n >= 0.001) return `$${n.toFixed(4)}`;
		return `$${n.toFixed(6)}`;
	}

	function formatNum(n: number): string {
		if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
		if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
		if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
		if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
		return n.toString();
	}

	function selectModel(id: string) {
		replaceParams({ model: id });
	}

	function selectSpecialist(m: ModelEntry) {
		modelQuery = '';
		comboOpen = false;
		triggerSpin?.();
		replaceParams({ specialist: m.name });
	}

	function selectPrecision(precId: string) {
		replaceParams({ prec: precId });
	}

	function updateCalls(calls: number) {
		const tpc = tokensPerCall || 4000;
		replaceParams({ calls: String(calls), tpc: String(tpc), tok: String(calls * tpc) });
	}

	function updateTpc(tpc: number) {
		const calls = callsPerMonth || 10000000;
		replaceParams({ calls: String(calls), tpc: String(tpc), tok: String(calls * tpc) });
	}

	let editingCalls = $state(false);
	let callsInputVal = $state('');
	let editingTpc = $state(false);
	let tpcInputVal = $state('');

	function commitCallsInput() {
		editingCalls = false;
		const raw = callsInputVal.trim().toLowerCase().replace(/,/g, '');
		let multiplier = 1;
		let num = raw;
		if (raw.endsWith('b')) { multiplier = 1e9; num = raw.slice(0, -1); }
		else if (raw.endsWith('m')) { multiplier = 1e6; num = raw.slice(0, -1); }
		else if (raw.endsWith('k')) { multiplier = 1e3; num = raw.slice(0, -1); }
		const parsed = parseFloat(num) * multiplier;
		if (!isNaN(parsed) && parsed > 0) updateCalls(Math.round(Math.min(Math.max(parsed, 1e6), 10e9)));
	}

	function commitTpcInput() {
		editingTpc = false;
		const raw = tpcInputVal.trim().toLowerCase().replace(/,/g, '');
		let multiplier = 1;
		let num = raw;
		if (raw.endsWith('k')) { multiplier = 1e3; num = raw.slice(0, -1); }
		const parsed = parseFloat(num) * multiplier;
		if (!isNaN(parsed) && parsed > 0) updateTpc(Math.round(Math.min(Math.max(parsed, 10), 100000)));
	}
</script>

<div class="calc">
	<div class="calc-header">
		<h1 class="calc-title">GPU cost calculator</h1>
		<p class="calc-desc">compare the cost of a generalist model to a self-hosted specialist at scale</p>
	</div>

	<!-- Stepper -->
	<div class="stepper">
		{#each STEPS as s, i}
			{@const isCurrent = s === step}
			{@const isReachable = stepReachable[s]}
			{@const isPast = isReachable && STEPS.indexOf(step) > i}
			<button
				class="step-dot"
				class:current={isCurrent}
				class:reachable={isReachable && !isCurrent}
				disabled={!isReachable || isCurrent}
				onclick={() => pushParams({ step: s })}
			><span class="step-tip">{s}</span></button>
			{#if i < STEPS.length - 1}
				<div class="step-line" class:filled={isPast}></div>
			{/if}
		{/each}
	</div>

	<!-- Platform -->
	<div class="platform">
		<div class="labels-row">
			<span class="shape-label" class:dim={!genActive}>Generalist</span>
			<span class="shape-label" class:dim={!specActive}>Specialist</span>
		</div>

		<div class="costs-row">
			<span class="cost-val" class:has-data={genActive && !!results} class:hidden={!genActive}>
				{genActive && results ? formatUsd(results.monthlyApiCost * 12) : '$0.00'}<span class="cost-per">/yr</span>
			</span>
			<span class="cost-val" class:has-data={specActive && !!results} class:hidden={!specActive}>
				{specActive && results ? formatUsd(results.monthlySelfHostedCost * 12) : '$0.00'}<span class="cost-per">/yr</span>
			</span>
		</div>

		<div class="ground">
			<div class="shapes-row">
				<button class="shape-area" onclick={(e) => { e.currentTarget.querySelector('.gen-shape')?.classList.remove('tap'); requestAnimationFrame(() => e.currentTarget.querySelector('.gen-shape')?.classList.add('tap')); }} aria-label="Generalist model">
					<svg viewBox="0 0 100 100" class="shape gen-shape" class:dim={!genActive} style="--gen-scale: {genActive ? genScale : 1}; transform: scale({genActive ? genScale : 1})" onanimationend={(e) => e.currentTarget.classList.remove('tap')}>
						<path d={generalistPath} fill="none" stroke-width="1" />
						{#if genActive && activeLogo}
							<svg x="35" y="45" width="30" height="30" viewBox={activeLogo.viewBox} class="vendor-logo">
								<path d={activeLogo.d} fill="currentColor" />
							</svg>
						{/if}
					</svg>
				</button>

				<button class="shape-area spec-area" aria-label="Specialist model" onclick={() => { triggerSpin?.(); }}>
					<div class="spec-mover">
						<svg viewBox="0 0 100 100" class="shape spec-shape" class:dim={!specActive} style="transform: scale({specActive ? specScale : 1})">
							<path d={specPathLive} fill="none" stroke-width="1.4" transform="rotate({specRotation} {SPEC_CX} {SPEC_CY})" />
							{#if specActive}
								<text x={SPEC_CX} y={SPEC_CY + 1} text-anchor="middle" dominant-baseline="central" class="size-label">{activeParamsB}B</text>
							{/if}
						</svg>
					</div>
				</button>
			</div>
			<div class="ground-line"></div>
		</div>

		{#if step === 'report'}
			<div class="savings-row collapsed"></div>
		{:else}
			<div class="savings-row" class:hidden={!specActive}>
				<span class="savings-label">Savings</span>
				{#if results && results.annualSavings > 0}
					<span class="savings-num">{formatUsd(results.annualSavings)}/yr</span>
				{:else if results}
					<span class="savings-num neg">−{formatUsd(Math.abs(results.annualSavings))}/yr</span>
				{:else}
					<span class="savings-num">$0/yr</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="controls">
		{#if step === 'model'}
			<h2 class="prompt">choose a generalist model <button class="help-btn" onclick={() => toggleHelp('model')}>?</button></h2>
			{#if activeHelp === 'model'}<span class="help-text">the API model you're paying for today. this calculator compares that cost against self-hosting.</span>{/if}
			<div class="model-grid">
				{#each PRIMARY_MODELS as model}
					{@const logo = VENDOR_LOGOS[model.provider.toLowerCase()]}
					<button
						class="model-card"
						class:selected={selectedApiModelId === model.id}
						onclick={() => selectModel(model.id)}
						onmouseenter={() => { hoveredModelId = model.id; }}
						onmouseleave={() => { hoveredModelId = ''; }}
					>
						<span class="mc-name">
							{#if logo}<svg class="mc-logo" viewBox={logo.viewBox}><path d={logo.d} fill="currentColor" /></svg>{/if}
							{model.name}
						</span>
						<span class="mc-price">${model.inputPer1M} / ${model.outputPer1M} per 1M</span>
					</button>
				{/each}
				{#if showOther}
					{#each ALL_MODELS.filter(m => !PRIMARY_MODELS.includes(m)) as model}
						{@const logo = VENDOR_LOGOS[model.provider.toLowerCase()]}
						<button
							class="model-card"
							class:selected={selectedApiModelId === model.id}
							onclick={() => selectModel(model.id)}
							onmouseenter={() => { hoveredModelId = model.id; }}
							onmouseleave={() => { hoveredModelId = ''; }}
						>
							<span class="mc-name">
								{#if logo}<svg class="mc-logo" viewBox={logo.viewBox}><path d={logo.d} fill="currentColor" /></svg>{/if}
								{model.name}
							</span>
							<span class="mc-price">{model.provider} · ${model.inputPer1M} / ${model.outputPer1M} per 1M</span>
						</button>
					{/each}
				{:else}
					<button class="model-card other-card" onclick={() => { showOther = true; }}>
						<span class="mc-name">more</span>
					</button>
				{/if}
			</div>
			<details class="calc-methodology">
				<summary class="methodology-toggle">how is this calculated?</summary>
				<div class="methodology-body">
					<p>API pricing from <a href="https://llm-prices.com" target="_blank" rel="noopener">llm-prices.com</a>. Input and output token prices are weighted by the input:output ratio from the workload step.</p>
					<p><a href="https://github.com/adaptive-ml/dev-site/blob/main/src/lib/cost-engine.ts" target="_blank" rel="noopener">see the source code</a></p>
				</div>
			</details>
			<div class="nav-row">
				<span></span>
				{#if selectedApiModelId}<button class="nav-btn" onclick={nextStep}>next →</button>{/if}
			</div>
		{:else if step === 'specialist'}
			<h2 class="prompt">choose a specialist <button class="help-btn" onclick={() => toggleHelp('specialist')}>?</button></h2>
			{#if activeHelp === 'specialist'}<span class="help-text">an <a href="/training">open model</a> <a href="/training/post-training/sft">fine-tuned</a> for your task using <a href="/optimization">RL</a>, then self-hosted on your own GPUs instead of calling an API.</span>{/if}

			<div class="combo" class:open={comboOpen} use:clickOutside={() => { comboOpen = false; modelQuery = ''; }}>
				<button
					class="combo-trigger"
					onclick={() => { comboOpen = !comboOpen; if (comboOpen) requestAnimationFrame(() => comboInputEl?.focus()); }}
				>
					{#if specialist}
						<span class="combo-selected">{specialist.name}</span>
						<span class="combo-selected-meta">{#if specialist.isMoE}{specialist.activeParamsB}B / {specialist.totalParamsB}B MoE{:else}{specialist.activeParamsB}B{/if}</span>
					{:else}
						<span class="combo-placeholder">select a model</span>
					{/if}
					<span class="combo-caret">{comboOpen ? '▴' : '▾'}</span>
				</button>
				{#if comboOpen}
					<div class="combo-dropdown">
						<input
							class="combo-search"
							type="text"
							placeholder="search models..."
							bind:value={modelQuery}
							bind:this={comboInputEl}
						/>
						<div class="combo-list">
							{#each filteredModels as m}
								{@const isPrimary = !!m.primary}
								{@const isFirst = m === filteredModels.find(f => !f.primary)}
								{#if isFirst && !modelQuery}<div class="combo-divider"></div>{/if}
								<button
									class="combo-item"
									class:selected={specialistName === m.name}
									onclick={() => selectSpecialist(m)}
									onmouseenter={() => { hoveredParamsB = m.activeParamsB; }}
									onmouseleave={() => { hoveredParamsB = null; }}
								>
									<span class="combo-item-name">{#if isPrimary}<span class="combo-star">★</span> {/if}{m.name}</span>
									<span class="combo-item-right">
										<span class="combo-item-meta">{#if m.isMoE}{m.activeParamsB}B / {m.totalParamsB}B MoE{:else}{m.activeParamsB}B{/if}</span>
										{#if m.suited}<span class="combo-item-suited">{m.suited}</span>{/if}
										<a class="combo-item-hf" href={m.url} target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()}>HF ↗</a>
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<details class="calc-methodology">
				<summary class="methodology-toggle">how is this calculated?</summary>
				<div class="methodology-body">
					<p>Throughput estimated from active parameters via a regression fit to <a href="https://nvidia.github.io/TensorRT-LLM/performance/perf-overview.html" target="_blank" rel="noopener">TRT-LLM v0.21 benchmarks</a>. For mixture-of-experts models, active parameters drive throughput; total parameters drive memory.</p>
					<p><a href="https://github.com/adaptive-ml/dev-site/blob/main/src/lib/cost-engine.ts" target="_blank" rel="noopener">see the source code</a></p>
				</div>
			</details>

			<div class="nav-row">
				<button class="nav-btn" onclick={() => { hoveredParamsB = null; prevStep(); }}>← back</button>
				{#if specialistName}<button class="nav-btn" onclick={() => { hoveredParamsB = null; nextStep(); }}>next →</button>{/if}
			</div>
		{:else if step === 'workload'}
			<h2 class="prompt">configure workload <button class="help-btn" onclick={() => toggleHelp('workload')}>?</button></h2>
			{#if activeHelp === 'workload'}<span class="help-text">how many requests you'll run and how large each one is. pick a task type to start, then adjust.</span>{/if}

			<div class="task-selector">
				{#each TASK_PRESETS as preset}
					<button
						class="task-btn"
						class:active={activeTask?.label === preset.label}
						onclick={() => selectTask(preset)}
					>
						<span class="task-btn-label">{preset.label}</span>
					</button>
				{/each}
			</div>

			<div class="workload-group">
				<div class="workload-row">
					<span class="workload-label">calls / month</span>
					{#if editingCalls}
						<input
							class="workload-input"
							type="text"
							inputmode="numeric"
							value={callsInputVal}
							oninput={(e) => { callsInputVal = e.currentTarget.value; }}
							onblur={commitCallsInput}
							onkeydown={(e) => { if (e.key === 'Enter') commitCallsInput(); if (e.key === 'Escape') { editingCalls = false; } }}
							use:autoFocus
						/>
					{:else}
						<button class="workload-value" onclick={() => { editingCalls = true; callsInputVal = formatNum(callsPerMonth || 10000000); }}>
							{formatNum(callsPerMonth || 10000000)}
						</button>
					{/if}
				</div>
				<input type="range" min="0" max={CALLS_SNAPS.length - 1} step="1" bind:value={callsSlider} oninput={() => { updateCalls(sliderToCalls(callsSlider)); }} class="slider workload-slider" />
			</div>
			<div class="workload-group">
				<div class="workload-row">
					<span class="workload-label">tokens / call</span>
					{#if editingTpc}
						<input
							class="workload-input"
							type="text"
							inputmode="numeric"
							value={tpcInputVal}
							oninput={(e) => { tpcInputVal = e.currentTarget.value; }}
							onblur={commitTpcInput}
							onkeydown={(e) => { if (e.key === 'Enter') commitTpcInput(); if (e.key === 'Escape') { editingTpc = false; } }}
							use:autoFocus
						/>
					{:else}
						<button class="workload-value" onclick={() => { editingTpc = true; tpcInputVal = String(tokensPerCall || 4000); }}>
							{formatNum(tokensPerCall || 4000)}
						</button>
					{/if}
				</div>
				<input type="range" min="0" max={TPC_STOPS.length - 1} step="1" bind:value={tpcSlider} oninput={() => { updateTpc(sliderToTpc(tpcSlider)); }} class="slider workload-slider" />
			</div>
			<div class="workload-group">
				<div class="workload-row">
					<span class="workload-label">input : output</span>
					<span class="workload-value static">{inputRatio}:{100 - inputRatio}</span>
				</div>
				<input type="range" min="10" max="95" step="5" value={inputRatio} oninput={(e) => replaceParams({ ratio: e.currentTarget.value })} class="slider workload-slider" />
			</div>
			<div class="workload-total">
				<span class="workload-total-label">total</span>
				<span class="workload-total-value">{formatNum(monthlyTokens * 12)}<span class="workload-total-unit"> tokens/yr</span></span>
			</div>
			<div class="nav-row">
				<button class="nav-btn" onclick={prevStep}>← back</button>
				<button class="nav-btn" onclick={nextStep}>next →</button>
			</div>
		{:else if step === 'gpu'}
			<h2 class="prompt">configure gpu</h2>
			<div class="workload-row">
				<span class="workload-label">gpu type <button class="help-btn" onclick={() => toggleHelp('gpu-type')}>?</button></span>
			</div>
			{#if activeHelp === 'gpu-type'}<span class="help-text">the GPU that runs your model. faster GPUs cost more per hour but serve more traffic, so fewer may be needed.</span>{/if}
			<div class="gpu-grid">
				{#each GPU_OPTIONS as gpu}
					<button
						class="gpu-card"
						class:selected={selectedGpu.id === gpu.id}
						onclick={() => { replaceParams({ gpu: gpu.id }); }}
						onmouseenter={() => { hoveredGpu = gpu; }}
						onmouseleave={() => { hoveredGpu = null; }}
					>
						<span class="gpu-name">{gpu.name}</span>
						<span class="gpu-meta">{gpu.memoryGb} GB · ${gpu.costPerHour}/hr</span>
					</button>
				{/each}
			</div>
			{#if results && !results.modelFitsGpu}
				{@const bytesPerParam = PRECISION_OPTIONS.find(p => p.id === precision)?.bytesPerParam ?? 1}
				<span class="gpu-warning">{activeSizeLabel} needs {Math.ceil(activeTotalParamsB * bytesPerParam)} GB in {activePrecision.toUpperCase()}. {activeGpu.name} has {activeGpu.memoryGb} GB.</span>
			{/if}

			{#if showMoreGpuOptions}
				<div class="workload-group">
					<div class="workload-row">
						<span class="workload-label">efficiency <button class="help-btn" onclick={() => toggleHelp('efficiency')}>?</button></span>
						<span class="workload-value static">{efficiency}%</span>
					</div>
					{#if activeHelp === 'efficiency'}<span class="help-text">what fraction of peak speed you'll actually get in production. the gap comes from latency constraints, uneven traffic, and serving overhead.</span>{/if}
					<input type="range" min="5" max="100" step="5" value={efficiency} oninput={(e) => replaceParams({ eff: e.currentTarget.value })} class="slider workload-slider" />
					{#if results}
						<span class="tps-estimate">{Math.round(results.outputThroughput * efficiency / 100)} output tok/s</span>
					{/if}
				</div>
				<div class="workload-group">
					<div class="workload-row">
						<span class="workload-label">precision <button class="help-btn" onclick={() => toggleHelp('precision')}>?</button></span>
					</div>
					{#if activeHelp === 'precision'}<span class="help-text">how precisely the model's weights are stored. lower precision uses less memory and runs faster. FP8 is standard for most models.</span>{/if}
					<div class="size-grid">
						{#each PRECISION_OPTIONS as p}
							<button
								class="size-card"
								class:selected={precision === p.id}
								onclick={() => selectPrecision(p.id)}
								onmouseenter={() => { hoveredPrecision = p.id; }}
								onmouseleave={() => { hoveredPrecision = null; }}
							>
								<span class="sc-name">{p.name}{#if p.id === 'fp8'} <span class="sc-label">standard</span>{/if}</span>
							</button>
						{/each}
					</div>
				</div>
				<button class="more-toggle" onclick={() => { showMoreGpuOptions = false; }}>▴ less</button>
			{:else}
				<button class="more-toggle" onclick={() => { showMoreGpuOptions = true; }}>▾ more</button>
			{/if}

			<div class="adv-section">
				<span class="workload-label">gpu count <button class="help-btn" onclick={() => toggleHelp('gpu-count')}>?</button></span>
				{#if activeHelp === 'gpu-count'}<span class="help-text">how many GPUs to run your model on. auto-calculated from your workload and efficiency, rounded up to node boundaries (e.g. 8 GPUs per H100 node).</span>{/if}
				<div class="count-controls">
					<button class="count-mode" class:selected={gpuCountMode === 'auto'} onclick={() => { replaceParams({ gpus: '' }); }}>auto</button>
					<button class="count-mode" class:selected={gpuCountMode === 'manual'} onclick={() => { replaceParams({ gpus: String(results?.gpusAuto ?? 1) }); }}>manual</button>
				</div>
				<div class="count-value-row">
					{#if gpuCountMode === 'manual'}
						<button class="count-btn" onclick={() => { if (gpuCountManual > 1) replaceParams({ gpus: String(gpuCountManual - 1) }); }}>−</button>
						{#if editingGpuCount}
							<input
								class="count-input"
								type="text"
								inputmode="numeric"
								value={gpuCountInputVal}
								oninput={(e) => { gpuCountInputVal = e.currentTarget.value; }}
								onblur={() => { const v = parseInt(gpuCountInputVal); if (!isNaN(v)) replaceParams({ gpus: String(Math.min(Math.max(v, 1), 128)) }); editingGpuCount = false; }}
								onkeydown={(e) => { if (e.key === 'Enter') { const v = parseInt(gpuCountInputVal); if (!isNaN(v)) replaceParams({ gpus: String(Math.min(Math.max(v, 1), 128)) }); editingGpuCount = false; } if (e.key === 'Escape') editingGpuCount = false; }}
								use:autoFocus
							/>
						{:else}
							<button class="count-value" onclick={() => { editingGpuCount = true; gpuCountInputVal = String(gpuCountManual); }}>{gpuCountManual}</button>
						{/if}
						<button class="count-btn" onclick={() => { if (gpuCountManual < 128) replaceParams({ gpus: String(gpuCountManual + 1) }); }}>+</button>
					{:else if results}
						<span class="count-value auto">{results.gpusAuto}</span>
					{/if}
				</div>
				{#if results}
					{@const utilPct = Math.round(results.utilization * 100)}
					{@const u = results.utilization}
				{@const utilColor =
					u > 0.95 ? '#f13242'
					: u > 0.80 ? `color-mix(in srgb, #f13242 ${Math.round((u - 0.80) / 0.15 * 100)}%, #ff8c00)`
					: u > 0.60 ? '#00ac3a'
					: u > 0.30 ? `color-mix(in srgb, #ff8c00 ${Math.round((1 - (u - 0.30) / 0.30) * 100)}%, #00ac3a)`
					: u > 0.10 ? '#ff8c00'
					: '#f13242'}
					<div class="util-bar">
						<div class="util-fill" style="width: {Math.min(utilPct, 100)}%; background: {utilColor}"></div>
					</div>
					<span class="util-label" style="color: {utilColor}">{utilPct === 0 && results.utilization > 0 ? '<1' : utilPct}% utilization</span>
				{/if}
			</div>

			<details class="calc-methodology">
				<summary class="methodology-toggle">how is this calculated?</summary>
				<div class="methodology-body">
					<p>Throughput estimated from a regression fit to <a href="https://nvidia.github.io/TensorRT-LLM/performance/perf-overview.html" target="_blank" rel="noopener">NVIDIA TRT-LLM v0.21 benchmarks</a> (Llama 8B/70B/405B, FP8, H100 + H200). Predicts output tokens/sec per GPU as a function of model size, input length, and output length. Other precisions scale from the FP8 baseline. L40S scaled from H100 by a fixed ratio (no benchmark data).</p>
					<p>The efficiency slider scales peak benchmark throughput down to account for production conditions. Benchmarks assume maximum concurrency with no latency constraints. The default is 20%.</p>
					<p>GPU pricing from <a href="https://aws.amazon.com/ec2/capacityblocks/pricing/" target="_blank" rel="noopener">AWS</a>. H100/H200: capacity block rates. L40S: on-demand. API pricing from <a href="https://llm-prices.com" target="_blank" rel="noopener">llm-prices.com</a>.</p>
					<p>GPU count sized on required output token throughput at the selected efficiency, rounded up to node pack sizes. Capacity planned on output tokens (the decode bottleneck), not total tokens.</p>
					<p>Self-hosted cost is GPU compute only. Does not include training, DevOps, networking, storage, or platform fees.</p>
					<p><a href="https://github.com/adaptive-ml/dev-site/blob/main/src/lib/cost-engine.ts" target="_blank" rel="noopener">see the source code</a></p>
				</div>
			</details>
			<div class="nav-row">
				<button class="nav-btn" onclick={prevStep}>← back</button>
				<button class="nav-btn" onclick={nextStep}>next →</button>
			</div>
		{:else if step === 'report' && results && apiModel}
			{@const savingsPositive = results.annualSavings > 0}
			{@const savingsPct = results.monthlyApiCost > 0 ? Math.round(Math.abs(results.annualSavings) / (results.monthlyApiCost * 12) * 100) : 0}
			{@const specialistInfo = specialist}
			{@const precInfo = PRECISION_OPTIONS.find(p => p.id === precision) ?? PRECISION_OPTIONS[0]}

			<div class="report-hero reveal" style="animation-delay: 0ms">
				<span class="report-headline settle" style="color: {savingsPositive ? '#00ac3a' : '#f13242'}">
					{savingsPositive ? 'save' : 'costs'} {formatUsd(Math.abs(results.annualSavings))}/yr
				</span>
				<span class="report-subline">
					{savingsPositive ? `${savingsPct}% less` : `${savingsPct}% more`} than {apiModel.name}
				</span>
			</div>

			<div class="report-breakdown reveal" style="animation-delay: 100ms">
				<div class="breakdown-section">
					<span class="breakdown-header">comparison</span>
					<div class="breakdown-cols">
						<div class="breakdown-col">
							<span class="breakdown-col-label">{apiModel.name}</span>
							<span class="breakdown-col-big">{formatUsd(results.monthlyApiCost * 12)}<span class="cost-per">/yr</span></span>
						</div>
						<div class="breakdown-col">
							<span class="breakdown-col-label">{specialistInfo?.name ?? 'specialist'} specialist</span>
							<span class="breakdown-col-big">{formatUsd(results.monthlySelfHostedCost * 12)}<span class="cost-per">/yr</span></span>
						</div>
					</div>
				</div>

				<div class="breakdown-section">
					<span class="breakdown-header">configuration</span>
					<button class="breakdown-row" onclick={() => pushParams({ step: 'model' })}>
						<span class="breakdown-label">generalist model</span>
						<span class="breakdown-value">{apiModel.name} <span class="breakdown-detail">${apiModel.inputPer1M}/${apiModel.outputPer1M} per 1M</span></span>
					</button>
					<button class="breakdown-row" onclick={() => pushParams({ step: 'specialist' })}>
						<span class="breakdown-label">specialist</span>
						<span class="breakdown-value">{specialistInfo?.name ?? 'specialist'} <span class="breakdown-detail">{specialistInfo?.suited ?? ''}</span></span>
					</button>
					<button class="breakdown-row" onclick={() => pushParams({ step: 'workload' })}>
						<span class="breakdown-label">volume</span>
						<span class="breakdown-value">{formatNum(monthlyTokens * 12)} tokens/yr <span class="breakdown-detail">{hasCallsMode ? `${formatNum(callsPerMonth)}/mo × ${formatNum(tokensPerCall)} tok` : ''} · {inputRatio}:{100 - inputRatio} in:out</span></span>
					</button>
					<button class="breakdown-row" onclick={() => pushParams({ step: 'gpu' })}>
						<span class="breakdown-label">infrastructure</span>
						<span class="breakdown-value">{results.gpusUsed}× {selectedGpu.name} <span class="breakdown-detail">{precInfo.name} · {efficiency}% efficiency · ${selectedGpu.costPerHour}/hr each</span></span>
					</button>
				</div>
			</div>

			<a href="https://www.adaptive-ml.com/contact-us" class="report-cta reveal" style="animation-delay: 300ms" target="_blank" rel="noopener">
				<span class="cta-icon">{@html symbolSvg}</span>
				<span class="cta-text">talk to an expert</span>
				<svg class="cta-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
			</a>

			<div class="nav-row reveal" style="animation-delay: 350ms">
				<button class="nav-btn" onclick={prevStep}>← back</button>
				<span></span>
			</div>
		{/if}
	</div>
</div>

<style>
	/* === Stepper === */
	.stepper {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 24px 0 8px;
		flex-shrink: 0;
	}

	.step-dot {
		position: relative;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1px solid var(--text-faint);
		background: none;
		padding: 0;
		cursor: default;
		transition: background 150ms ease, border-color 150ms ease;
	}

	.step-dot.reachable {
		background: var(--text-muted);
		border-color: var(--text-muted);
		cursor: pointer;
	}

	.step-dot.reachable:hover {
		background: var(--text);
		border-color: var(--text);
	}

	.step-dot.current {
		background: var(--text);
		border-color: var(--text);
	}

	.step-dot:disabled:not(.current) {
		opacity: 0.5;
	}

	.step-tip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition: opacity 100ms ease;
	}

	.step-dot:hover:not(:disabled) .step-tip,
	.step-dot.current:hover .step-tip {
		opacity: 1;
	}

	.step-line {
		width: 24px;
		height: 1px;
		background: var(--text-faint);
		transition: background 150ms ease;
	}

	.step-line.filled {
		background: var(--text-muted);
	}

	.calc {
		width: 100%;
		max-width: 600px;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 0 auto;
		overflow: hidden;
	}

	.calc-header {
		text-align: center;
		padding: 16px 24px 12px;
		border-bottom: 1px solid var(--rule);
	}
	.calc-title {
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}
	.calc-desc {
		font-size: 13px;
		color: var(--text-dim);
		margin: 4px 0 0;
	}

	/* === Platform (never scrolls) === */
	.platform {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		flex-shrink: 0;
	}

	.labels-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.shape-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-align: center;
		transition: opacity 200ms ease;
	}

	.shape-label.dim { opacity: 0.2; }

	/* Costs (above shapes) */
	.costs-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 4px 0;
	}

	.cost-val {
		font-family: var(--font-mono);
		font-size: 15px;
		font-weight: 700;
		color: var(--text-faint);
		letter-spacing: -0.02em;
		text-align: center;
		transition: color 150ms ease, opacity 200ms ease;
	}

	.cost-val.has-data { color: var(--text-dim); }

	.hidden { visibility: hidden; }

	.cost-per {
		font-size: 10px;
		font-weight: 400;
	}

	/* Ground: shapes sit on the line */
	.ground {
		position: relative;
	}

	.ground-line {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--rule);
	}

	.shapes-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		justify-items: center;
		position: relative;
		z-index: 1;
		height: 120px;
	}

	.shape-area {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.gen-shape {
		width: 120px;
		height: 120px;
		overflow: visible;
		transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
		transform-origin: center bottom;
	}

	@keyframes tap {
		0% { transform: scale(var(--gen-scale, 1)); }
		30% { transform: scale(calc(var(--gen-scale, 1) * 0.92)); }
		100% { transform: scale(var(--gen-scale, 1)); }
	}

	.gen-shape:global(.tap) { animation: tap 300ms ease-out; }

	.gen-shape path { stroke: var(--text); transition: opacity 200ms ease; }
	.gen-shape.dim path { opacity: 0.2; }

	.vendor-logo { color: var(--text-muted); transition: opacity 200ms ease; }
	.gen-shape.dim .vendor-logo { opacity: 0.2; }

	.spec-area {
		position: relative;
	}

	.spec-mover {
		width: 84px;
		height: 84px;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		25% { transform: translateY(-5px); }
		50% { transform: translateY(-2px); }
		75% { transform: translateY(-6px); }
	}

	.spec-shape {
		width: 84px;
		height: 84px;
		overflow: visible;
		transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
		transform-origin: center center;
	}

	.spec-shape path { stroke: var(--text); transition: opacity 200ms ease; }
	.spec-shape.dim path { opacity: 0.2; }

	.size-label {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		fill: var(--text-muted);
		transition: opacity 200ms ease;
	}
	.spec-shape.dim .size-label { opacity: 0.2; }

	/* Savings (below the line) */
	.savings-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 8px 0;
		min-height: 32px;
	}

	.savings-row.collapsed { min-height: 0; padding: 0; }

	.savings-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.savings-num {
		font-family: var(--font-mono);
		font-size: 14px;
		font-weight: 700;
		color: var(--green, #00ac3a);
	}

	.savings-num.neg { color: var(--red, #f13242); }

	/* === Controls === */
	.controls {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-height: 0;
		overflow-y: auto;
		padding-right: 8px;
	}

	.prompt {
		font-family: var(--font-mono);
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
	}


	/* === Model grid === */
	.model-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.model-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 14px;
		background: none;
		border: 1px solid var(--rule);
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		flex-shrink: 0;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}

	.model-card:hover { border-color: var(--text); border-radius: 18px; }
	.model-card.selected { border-color: var(--text); }

	.mc-name {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.mc-logo {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		color: var(--text-dim);
	}

	.mc-price {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
	}


	/* === Size step === */
	.size-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.size-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 14px;
		background: none;
		border: 1px solid var(--rule);
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}
	.size-card:hover { border-color: var(--text); border-radius: 18px; }
	.size-card.selected { border-color: var(--text); }

	.sc-name {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
	}

	.sc-label {
		font-weight: 400;
		color: var(--text-muted);
		margin-left: 0.4em;
	}

	.tps-estimate {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
	}

	/* === Specialist combobox === */
	.combo { position: relative; }
	.combo-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 10px 12px;
		background: rgba(10, 10, 12, 0.8);
		border: 1px solid var(--rule);
		border-radius: 6px;
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}
	.combo-trigger:hover { border-color: var(--text-muted); }
	.combo.open .combo-trigger { border-color: var(--text-muted); border-radius: 6px 6px 0 0; }
	.combo-selected { font-weight: 500; color: var(--text); }
	.combo-selected-meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-left: 8px; }
	.combo-placeholder { color: var(--text-faint); }
	.combo-caret { margin-left: auto; color: var(--text-faint); font-size: 11px; }
	.combo-dropdown {
		border: 1px solid var(--rule);
		border-top: none;
		border-radius: 0 0 6px 6px;
		overflow: hidden;
	}
	.combo-search {
		width: 100%;
		padding: 8px 12px;
		background: rgba(10, 10, 12, 0.6);
		border: none;
		border-bottom: 1px solid var(--rule);
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 12px;
		outline: none;
	}
	.combo-search::placeholder { color: var(--text-faint); }
	.combo-list { max-height: 240px; overflow-y: auto; }
	.combo-divider { height: 1px; background: var(--rule); margin: 4px 12px; }
	.combo-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		transition: background 100ms ease;
	}
	.combo-item:hover { background: rgba(255, 255, 255, 0.05); }
	.combo-item.selected { color: var(--text); }
	.combo-star { color: var(--text-muted); font-size: 10px; }
	.combo-item-right { display: flex; align-items: center; gap: 8px; }
	.combo-item-meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
	.combo-item-suited { font-size: 11px; color: var(--text-faint); }
	.combo-item-hf {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-faint);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.combo-item-hf:hover { color: var(--text-muted); }

	/* === Workload step === */
	.workload-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.workload-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.workload-label {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	.workload-value {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		background: none;
		border: none;
		border-bottom: 1px dashed var(--text-faint);
		cursor: text;
		padding: 0 2px 1px;
		transition: border-color 150ms ease;
	}

	.workload-value.static {
		cursor: default;
		border-bottom: none;
	}

	.workload-value:hover:not(.static) {
		border-color: var(--text-muted);
	}

	.workload-input {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		background: none;
		border: none;
		border-bottom: 1px solid var(--text);
		outline: none;
		text-align: right;
		width: 6ch;
		padding: 0 2px 1px;
	}

	.workload-slider {
		width: 100%;
	}

	.task-selector {
		display: flex;
		gap: 8px;
	}
	.task-btn {
		flex: 1;
		padding: 6px 8px;
		background: none;
		border: 1px solid var(--rule);
		border-radius: 4px;
		cursor: pointer;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}
	.task-btn:hover { border-color: var(--text-muted); border-radius: 14px; }
	.task-btn.active { border-color: var(--text-muted); }
	.task-btn-label {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}
	.task-btn.active .task-btn-label { color: var(--text-body); }

	.workload-total {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 12px 14px;
		background: rgba(10, 10, 12, 0.8);
		border: 1px solid var(--rule);
		border-radius: 6px;
	}

	.workload-total-label {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.workload-total-value {
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.workload-total-unit {
		font-weight: 400;
		font-size: 12px;
		color: var(--text-dim);
		margin-left: 4px;
	}

	.more-toggle {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: underline;
		text-decoration-color: var(--text-faint);
		text-underline-offset: 3px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 0;
		align-self: center;
		transition: color 150ms ease, text-decoration-color 150ms ease;
	}

	.more-toggle:hover {
		color: var(--text);
		text-decoration-color: var(--text-muted);
	}

	.slider {
		flex: 1;
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		outline: none;
		cursor: pointer;
		height: 20px;
	}

	.slider::-webkit-slider-runnable-track {
		height: 20px;
		background: linear-gradient(var(--rule), var(--rule)) center / 100% 1px no-repeat;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 4px;
		background: var(--void);
		border: 1px solid var(--text);
		margin-top: 4px;
		cursor: pointer;
		transition: border-radius 200ms ease;
	}

	.slider::-webkit-slider-thumb:hover {
		border-radius: 6px;
	}

	.slider::-moz-range-track {
		height: 20px;
		background: linear-gradient(var(--rule), var(--rule)) center / 100% 1px no-repeat;
		border: none;
	}

	.slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 4px;
		background: var(--void);
		border: 1px solid var(--text);
		cursor: pointer;
		transition: border-radius 200ms ease;
	}

	.slider::-moz-range-thumb:hover {
		border-radius: 6px;
	}


	/* === Navigation === */
	.nav-row {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}

	.nav-btn {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		background: none;
		border: 1px solid var(--rule);
		padding: 6px 14px;
		border-radius: 4px;
		cursor: pointer;
		flex-shrink: 0;
		transition: border-color 150ms ease, color 150ms ease, border-radius 200ms ease;
	}

	.nav-btn:hover:not(:disabled) {
		border-color: var(--rule-strong);
		color: var(--text);
		border-radius: 18px;
	}

	.nav-btn:disabled {
		opacity: 0.2;
		cursor: default;
	}

	/* === Advanced sections === */
	.adv-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		background: rgba(10, 10, 12, 0.8);
		border: 1px solid var(--rule);
		border-radius: 4px;
	}

	.gpu-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.gpu-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 14px;
		background: none;
		border: 1px solid var(--rule);
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}

	.gpu-card:hover { border-color: var(--text); border-radius: 18px; }
	.gpu-card.selected { border-color: var(--text); }

	.gpu-warning {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--red, #f13242);
	}

	.gpu-name {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		color: var(--text);
	}

	.gpu-meta {
		font-family: var(--font-mono);
		font-size: 9px;
		color: var(--text-muted);
	}



	.count-controls {
		display: flex;
		gap: 4px;
	}

	.count-mode {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		color: var(--text-faint);
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 3px 8px;
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease;
	}

	.count-mode:hover { color: var(--text-muted); }
	.count-mode.selected { color: var(--text-muted); border-color: var(--rule); }

	.count-value-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.count-value {
		font-family: var(--font-mono);
		font-size: 28px;
		font-weight: 700;
		color: var(--text);
		min-width: 48px;
		text-align: center;
		background: none;
		border: none;
		border-bottom: 1px dashed var(--text-faint);
		cursor: text;
		padding: 0 4px 2px;
		transition: border-color 150ms ease;
	}

	.count-value:hover { border-color: var(--text-muted); }
	.count-value.auto { cursor: default; border: none; }

	.count-input {
		font-family: var(--font-mono);
		font-size: 28px;
		font-weight: 700;
		color: var(--text);
		background: none;
		border: none;
		border-bottom: 1px solid var(--text);
		outline: none;
		text-align: center;
		width: 64px;
		padding: 0 4px 2px;
	}

	.count-btn {
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 600;
		color: var(--text-muted);
		background: none;
		border: 1px solid var(--rule);
		border-radius: 4px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 150ms ease, color 150ms ease, border-radius 200ms ease;
	}

	.count-btn:hover { border-color: var(--text); color: var(--text); border-radius: 18px; }

	.util-bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.util-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 300ms cubic-bezier(0.16, 1, 0.3, 1), background 300ms ease;
	}

	.util-label {
		font-family: var(--font-mono);
		font-size: 10px;
		transition: color 300ms ease;
	}


	.help-btn {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1px solid var(--text-faint);
		background: none;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		cursor: pointer;
		padding: 0;
		transition: border-color 150ms ease, color 150ms ease;
	}

	.help-btn:hover { border-color: var(--text-muted); color: var(--text-muted); }

	.help-text {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-dim);
		line-height: 1.5;
	}

	.help-text a {
		color: var(--text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.help-text a:hover {
		color: var(--text-body);
	}


/* === Report === */
	@keyframes reveal {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes settle {
		0% { transform: scale(0.9); opacity: 0; }
		50% { transform: scale(1.06); opacity: 1; }
		75% { transform: scale(0.98); }
		100% { transform: scale(1); }
	}

	.reveal {
		opacity: 0;
		animation: reveal 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.report-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 16px 0;
	}

	.report-breakdown {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.breakdown-section {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.breakdown-header {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		color: var(--text-faint);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--rule);
	}

	.breakdown-cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		padding: 12px 0;
	}

	.breakdown-col {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.breakdown-col-label {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.breakdown-col-big {
		font-family: var(--font-mono);
		font-size: 20px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
	}

	.breakdown-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 10px 0;
		border-bottom: 1px solid var(--rule);
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		cursor: pointer;
		text-align: left;
		transition: padding-left 150ms ease;
	}

	.breakdown-row:first-of-type {
		border-top: none;
	}

	.breakdown-row:hover {
		padding-left: 6px;
	}

	.breakdown-label {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.breakdown-value {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		color: var(--text);
		text-align: right;
	}

	.breakdown-detail {
		font-weight: 400;
		color: var(--text-dim);
		margin-left: 6px;
	}

	.report-headline {
		font-family: var(--font-mono);
		font-size: 28px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.report-headline.settle {
		animation: settle 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.report-subline {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-dim);
	}


/* CTA */
	.report-cta {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		margin-top: 8px;
		padding: 12px 16px;
		border: 1px solid var(--rule);
		border-radius: 4px;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}
	.report-cta:hover {
		border-color: var(--rule-strong);
		border-radius: 18px;
	}
	.cta-icon {
		display: flex;
		flex-shrink: 0;
	}
	.cta-icon :global(svg) {
		width: 16px;
		height: 16px;
	}
	.cta-text {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 500;
		color: var(--text-muted);
	}
	.cta-arrow {
		flex-shrink: 0;
		color: var(--text-muted);
		transition: color 150ms ease;
	}
	.report-cta:hover .cta-text,
	.report-cta:hover .cta-arrow {
		color: var(--text);
	}

	.calc-methodology {
		margin-top: 8px;
	}
	.methodology-toggle {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		cursor: pointer;
		transition: color 150ms ease;
	}
	.methodology-toggle:hover { color: var(--text-muted); }
	.methodology-body {
		margin-top: 8px;
		padding: 12px;
		background: rgba(10, 10, 12, 0.8);
		border-radius: 8px;
		font-size: 12px;
		line-height: 1.6;
		color: var(--text-dim);
	}
	.methodology-body p { margin: 0 0 8px; }
	.methodology-body p:last-child { margin: 0; }
	.methodology-body a {
		color: var(--text-muted);
		text-decoration: underline;
		text-decoration-thickness: 0.12em;
		text-underline-offset: 0.2em;
	}
	.methodology-body a:hover { color: var(--text-body); }

	@media (max-width: 768px) {
		.gen-shape { width: 96px; height: 96px; }
		.spec-mover { width: 66px; height: 66px; }
		.spec-shape { width: 66px; height: 66px; }
		.cost-val { font-size: 13px; }
		.model-grid { grid-template-columns: 1fr; }
	}
</style>
