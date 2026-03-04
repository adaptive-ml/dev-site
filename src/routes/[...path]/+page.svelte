<script lang="ts">
	import { entrance } from '$lib/entrance';

	let { data } = $props();
	const node = $derived(data.node);
</script>

<svelte:head>
	<title>{node.title}{node.abbr ? ` (${node.abbr})` : ''} — RL Glossary</title>
</svelte:head>

<div class="page" use:entrance>
	{#if node.component}
		<div class="prose">
			<node.component />
		</div>
	{/if}
</div>

<style>
	.page {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow-y: auto;
		padding: 48px;
	}

	.prose {
		display: flex;
		flex-direction: column;
		gap: 32px;
		width: 100%;
		max-width: 720px;
		margin: auto 0;
	}

	.prose :global(p) {
		font-size: 18px;
		line-height: 1.8;
		color: var(--text-body);
	}

	.prose :global(a) {
		color: var(--text);
		text-decoration: underline;
		text-decoration-color: var(--rule);
		text-underline-offset: 3px;
		transition: text-decoration-color 150ms ease;
	}

	.prose :global(a:hover) {
		text-decoration-color: var(--text);
	}

	/* bold key terms in mono — the shape morph as typography */
	.prose :global(strong) {
		font-family: var(--font-mono);
		font-size: 0.92em;
		color: var(--text);
		font-weight: 600;
	}

	.prose :global(h2) {
		font-family: var(--font-mono);
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--text);
		margin-top: 16px;
	}

	.prose :global(h3) {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-dim);
		margin-top: 8px;
	}

	.prose :global(ul), .prose :global(ol) {
		font-size: 18px;
		line-height: 1.8;
		color: var(--text-body);
		padding-left: 1.5em;
	}

	@media (max-width: 768px) {
		.page {
			padding: 24px;
		}

		.prose :global(p),
		.prose :global(ul),
		.prose :global(ol) {
			font-size: 17px;
		}
	}
</style>
