<script lang="ts">
	import Stage from '$lib/components/RlPainters/Stage.svelte';

	function openInNewTab(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
		if (!a) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		window.open(a.href, '_blank', 'noopener,noreferrer');
	}
</script>

<svelte:head>
	<title>RL Painters</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:document onclickcapture={openInNewTab} />

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
