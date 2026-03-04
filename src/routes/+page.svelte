<script lang="ts">
	import symbol from '$logos/symbol/symbol-white.svg?raw';
	import { onMount } from 'svelte';

	let splashRevealed = $state(false);

	onMount(() => {
		requestAnimationFrame(() => { splashRevealed = true; });
	});
</script>

<svelte:head>
	<title>RL Glossary — Adaptive ML</title>
</svelte:head>

<div class="home">
	<div class="splash" class:revealed={splashRevealed}>
		{@html symbol}
	</div>
</div>

<style>
	.home {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.splash {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.splash :global(svg) {
		width: min(22vmin, 60vw);
		max-height: 60vh;
		overflow: visible;
	}

	.splash :global(path) {
		fill: rgba(255, 255, 255, 0.04);
		stroke: white;
		stroke-width: 1.5;
		opacity: 0;
		transform-origin: center;
		transform-box: fill-box;
	}

	.splash :global(path:nth-child(1)) {
		transform: translate(-60px, -40px) rotate(-180deg) scale(0.5);
		transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-out;
		transition-delay: 0s;
	}

	.splash :global(path:nth-child(2)) {
		transform: translate(50px, 50px) rotate(180deg) scale(0.5);
		transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-out;
		transition-delay: 0.1s;
	}

	.splash.revealed :global(path) {
		opacity: 1;
		transform: translate(0, 0) rotate(0deg) scale(1);
	}
</style>
