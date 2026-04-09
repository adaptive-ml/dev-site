<script lang="ts">
	import { onMount } from 'svelte';
	import { formatUsd, type ApiModel, type CalcOutputs } from '$lib/cost-engine';

	let {
		apiModel = undefined,
		activeParamsB = 8,
		specActive = false,
		genActive = false,
		results = null,
		step = 'model',
		activeLogo = null,
		hoveredModelId = '',
		selectedApiModelId = '',
		genScale = 1,
		specScale = 1,
	}: {
		apiModel?: ApiModel;
		activeParamsB: number;
		specActive: boolean;
		genActive: boolean;
		results: CalcOutputs | null;
		step: string;
		activeLogo: { viewBox: string; d: string } | null;
		hoveredModelId: string;
		selectedApiModelId: string;
		genScale: number;
		specScale: number;
	} = $props();

	// Shape generation
	const HEX_ROT = Math.PI / 6;
	function sharpHexPath(r: number, cx: number, cy: number): string {
		const pts: string[] = [];
		for (let i = 0; i < 6; i++) {
			const angle = (Math.PI / 3) * i - Math.PI / 2 + HEX_ROT;
			pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
		}
		return `M ${pts.join(' L ')} Z`;
	}

	const KAPPA = 0.5522847498;
	function morphPath(t: number, r: number, cx: number, cy: number): string {
		const segments: string[] = [];
		for (let i = 0; i < 6; i++) {
			const a1 = (Math.PI / 3) * i - Math.PI / 2;
			const a2 = (Math.PI / 3) * ((i + 1) % 6) - Math.PI / 2;
			const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
			const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
			const tan1x = -Math.sin(a1), tan1y = Math.cos(a1);
			const tan2x = Math.sin(a2), tan2y = -Math.cos(a2);
			const k = KAPPA * r * (2 * Math.sin(Math.PI / 6));
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
	const GEN_CY = 100 - GEN_R;
	const SPEC_CX = 50;
	const SPEC_CY = GEN_CY;
	const generalistPath = $derived(sharpHexPath(GEN_R, 50, GEN_CY));

	let specRotation = $state(0);
	let specPathLive = $state(morphPath(0, SPEC_R, SPEC_CX, SPEC_CY));
	let triggerSpinInternal: (() => void) | null = null;

	export function triggerSpin() {
		triggerSpinInternal?.();
	}

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

		triggerSpinInternal = () => { pendingSpin = true; };

		function tick() {
			const elapsed = (performance.now() - start) / 1000;
			const morphT = 0.75 + 0.25 * Math.sin(elapsed * Math.PI / 3);
			specPathLive = morphPath(morphT, SPEC_R, SPEC_CX, SPEC_CY);

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
		return () => { cancelAnimationFrame(frame); triggerSpinInternal = null; };
	});

</script>

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
			<button class="shape-area" onclick={(e) => { const el = e.currentTarget?.querySelector('.gen-shape'); el?.classList.remove('tap'); requestAnimationFrame(() => el?.classList.add('tap')); }} aria-label="Generalist model">
				<svg viewBox="0 0 100 100" class="shape gen-shape" class:dim={!genActive} style="--gen-scale: {genActive ? genScale : 1}; transform: scale({genActive ? genScale : 1})" onanimationend={(e) => e.currentTarget.classList.remove('tap')}>
					<path d={generalistPath} fill="none" stroke-width="1" />
					{#if genActive && activeLogo}
						<svg x="35" y="45" width="30" height="30" viewBox={activeLogo.viewBox} class="vendor-logo">
							<path d={activeLogo.d} fill="currentColor" />
						</svg>
					{/if}
				</svg>
			</button>

			<button class="shape-area spec-area" aria-label="Specialist model" onclick={() => { triggerSpinInternal?.(); }}>
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

<style>
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

	.ground { position: relative; }

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
		align-items: end;
		justify-items: center;
		position: relative;
		z-index: 1;
		min-height: 120px;
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

	.spec-area { position: relative; }

	.spec-mover {
		width: 120px;
		height: 120px;
		transform: translateY(-3px);
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(-3px); }
		25% { transform: translateY(-8px); }
		50% { transform: translateY(-5px); }
		75% { transform: translateY(-9px); }
	}

	.spec-shape {
		width: 120px;
		height: 120px;
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
</style>
