<script lang="ts">
	import logoWhite from '$logos/full/adaptive-logo-white.svg?raw';
	import logoBlack from '$logos/full/adaptive-logo-black.svg?raw';

	let { color = 'white', height = 24 }: { color?: 'white' | 'black'; height?: number } = $props();
	const svg = $derived(color === 'white' ? logoWhite : logoBlack);
</script>

<span class="logo" style="height: {height}px;" aria-label="Adaptive ML">
	{@html svg}
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
	}

	.logo :global(svg) {
		height: 100%;
		width: auto;
	}
</style>
