<script lang="ts">
	import { onMount } from 'svelte';
	import { Gradient, type DomRectData } from '$lib/gradient';

	let {
		seed = 'rl-field-guide',
		class: className = '',
		domRects = [] as DomRectData[],
		register = 0,
		active = $bindable(false),
		gpuElapsed = $bindable(-1),
	}: {
		seed?: string;
		class?: string;
		domRects?: DomRectData[];
		register?: number;
		active?: boolean;
		gpuElapsed?: number;
	} = $props();

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let gradient: Gradient | null = null;

	const MAX_DPR = 2;

	function clampDim(px: number, max: number): number {
		return Math.max(1, Math.min(Math.round(px), max));
	}

	function resize() {
		if (!canvas || !gradient || !container) return;
		const rect = container.parentElement?.getBoundingClientRect();
		if (!rect) return;
		const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
		const max = gradient.maxTextureSize;
		canvas.width = clampDim(rect.width * dpr, max);
		canvas.height = clampDim(rect.height * dpr, max);
		canvas.style.width = rect.width + 'px';
		canvas.style.height = rect.height + 'px';
		gradient.resize();
	}

	onMount(() => {
		const parent = container.parentElement;
		if (!parent) return;

		const rect = parent.getBoundingClientRect();
		const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
		canvas.width = Math.max(1, Math.round(rect.width * dpr));
		canvas.height = Math.max(1, Math.round(rect.height * dpr));
		canvas.style.width = rect.width + 'px';
		canvas.style.height = rect.height + 'px';

		gradient = new Gradient(canvas, { seed });
		gradient.start().then(() => {
			active = !gradient!.error;
			gpuElapsed = gradient!.elapsed;
			resize();
			gradient!.setDomRects(domRects);
			gradient!.setRegister(register);
		});

		const observer = new ResizeObserver(resize);
		observer.observe(parent);

		return () => {
			observer.disconnect();
			gradient?.destroy();
		};
	});

	$effect(() => {
		if (gradient) {
			gradient.setDomRects(domRects);
		}
	});

	$effect(() => {
		if (gradient) {
			gradient.setRegister(register);
		}
	});

</script>

<div bind:this={container} class="gradient-wrap {className}">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.gradient-wrap {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	canvas {
		display: block;
	}
</style>
