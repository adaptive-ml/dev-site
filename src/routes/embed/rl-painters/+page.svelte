<script lang="ts">
	import Stage from '$lib/components/RlPainters/Stage.svelte';
</script>

<svelte:head>
	<base target="_blank" />
	<title>RL Painters</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="embed-stage">
	<Stage />
</div>

<style>
	.embed-stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
</style>
