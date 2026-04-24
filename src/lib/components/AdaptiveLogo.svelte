<script lang="ts">
	import logo from '$logos/full/adaptive-logo-white.svg?raw';

	let { height = 24 }: { height?: number } = $props();
</script>

<span class="logo" style="height: {height}px;" aria-label="Adaptive ML">
	{@html logo}
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		color: var(--text);
	}

	.logo :global(svg) {
		height: 100%;
		width: auto;
	}

	.logo :global(svg path) {
		fill: currentColor;
	}
</style>
