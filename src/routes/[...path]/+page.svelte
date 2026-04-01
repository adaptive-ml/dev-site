<script lang="ts">
	import { entrance } from '$lib/entrance';
	import symbolSvg from '$logos/symbol/symbol-white.svg?raw';
	import { getPageRefs } from '$lib/references';
	import { openReference } from '$lib/referencePopup';

	const ORIGIN = 'https://dev.adaptive-ml.com';

	let { data } = $props();
	const node = $derived(data.node);
	const pageRefs = $derived(getPageRefs(data.segments.join('/')));
	const pageUrl = $derived(`${ORIGIN}/${data.segments.join('/')}`);

	const breadcrumbLd = $derived({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "RL Glossary", "item": ORIGIN },
			...data.breadcrumbs.map((b: { title: string; path: string }, i: number) => ({
				"@type": "ListItem",
				"position": i + 2,
				"name": b.title,
				"item": `${ORIGIN}/${b.path}`
			}))
		]
	});

	const pageLd = $derived(node.children ? {
		"@context": "https://schema.org",
		"@type": "DefinedTermSet",
		"name": node.title,
		"description": node.description ?? "",
		"url": pageUrl
	} : {
		"@context": "https://schema.org",
		"@type": "DefinedTerm",
		"name": node.title,
		"description": node.description ?? "",
		"url": pageUrl,
		"inDefinedTermSet": {
			"@type": "DefinedTermSet",
			"name": "RL Glossary",
			"url": ORIGIN
		}
	});

	function externalLinks(node: HTMLElement) {
		for (const a of node.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')) {
			if (!a.hostname.includes('adaptive-ml')) {
				a.target = '_blank';
				a.rel = 'noopener';
			}
		}
	}
</script>

<svelte:head>
	<title>{node.title}{node.abbr ? ` (${node.abbr})` : ''} — RL Glossary</title>
	{#if node.description}
		<meta name="description" content={node.description} />
		<meta property="og:title" content="{node.title}{node.abbr ? ` (${node.abbr})` : ''} — RL Glossary" />
		<meta property="og:description" content={node.description} />
		<meta property="og:type" content="article" />
		<meta name="image" property="og:image" content="https://dev.adaptive-ml.com/thumb.png" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content="https://dev.adaptive-ml.com/thumb.png" />
		<meta name="twitter:title" content="{node.title}{node.abbr ? ` (${node.abbr})` : ''} — RL Glossary" />
		<meta name="twitter:description" content={node.description} />
	{/if}
	{@html `<script type="application/ld+json">${JSON.stringify(pageLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<div class="page" use:entrance use:externalLinks>
	<h1 class="sr-only">{node.title}{node.abbr ? ` (${node.abbr})` : ''}</h1>
	{#if node.component}
		<div class="prose">
			<node.component />
			{#if pageRefs.length > 0}
				<div class="references">
					<span class="references-header">
						<span class="references-label">References</span>
						<button class="references-viewall" onclick={() => openReference(pageRefs[0])}>View all</button>
					</span>
					<ol class="references-list">
						{#each pageRefs as ref}
							<li class="reference">
								<button class="ref-number" onclick={() => openReference(ref)}>{ref.id}</button>
								<a href={ref.url} target="_blank" rel="noopener noreferrer" class="reference-link">
									{ref.title}
								</a>
								{#if ref.authors}
									<span class="reference-authors">{ref.authors}</span>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</div>
	{/if}
	<a href="https://www.adaptive-ml.com/contact-us" class="entry-cta" target="_blank" rel="noopener">
		<span class="cta-symbol">{@html symbolSvg}</span>
		<span class="cta-headline">Talk to an RL expert</span>
		<svg class="cta-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
	</a>
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
		gap: 24px;
		width: 100%;
		max-width: 720px;
		margin: auto 0;
	}

	.prose :global(p) {
		font-size: 16px;
		line-height: 1.75;
		color: var(--text-body);
		text-align: left;
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
		font-size: 16px;
		line-height: 1.75;
		color: var(--text-body);
		padding-left: 1.5em;
	}

	/* — references — */

	.references {
		width: 100%;
		max-width: 720px;
		margin-top: 48px;
		padding-top: 24px;
		border-top: 1px solid var(--rule);
	}

	.references-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.references-label {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.references-viewall {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 3px;
		transition: color 150ms ease, text-decoration-color 150ms ease;
	}

	.references-viewall:hover {
		color: var(--text-muted);
		text-decoration-color: var(--text-faint);
	}

	.references-list {
		list-style: none;
		padding: 0;
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.reference {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-left: 36px;
		position: relative;
	}

	.ref-number {
		position: absolute;
		left: 0;
		top: 1px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-faint);
		line-height: 1.4;
		background: none;
		border: 1px solid var(--text-faint);
		border-radius: 4px;
		padding: 1px 5px;
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease, border-radius 200ms ease;
	}

	.ref-number:hover {
		color: var(--text-muted);
		border-color: var(--text-muted);
		border-radius: 18px;
	}

	.reference-link {
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-dim);
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 3px;
		transition: color 150ms ease, text-decoration-color 150ms ease;
	}

	.reference-link:hover {
		color: var(--text);
		text-decoration-color: var(--rule);
	}

	.reference-authors {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		line-height: 1.4;
	}

	/* — CTA — */

	.entry-cta {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		max-width: 720px;
		margin-top: 48px;
		padding: 12px 16px;
		border: 1px solid var(--rule);
		border-radius: 4px;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}

	.entry-cta:hover {
		border-color: var(--rule-strong);
		border-radius: 18px;
	}

	.cta-symbol {
		display: flex;
		flex-shrink: 0;
	}

	.cta-symbol :global(svg) {
		width: 16px;
		height: 16px;
	}

	.cta-headline {
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

	.entry-cta:hover .cta-headline,
	.entry-cta:hover .cta-arrow {
		color: var(--text);
	}

	@media (max-width: 768px) {
		.page {
			padding: 24px;
		}

		.prose :global(p),
		.prose :global(ul),
		.prose :global(ol) {
			font-size: 15px;
		}

		.references {
			margin-top: 36px;
		}

		.entry-cta {
			margin-top: 36px;
			gap: 10px;
			padding: 10px 14px;
		}

		.cta-headline {
			font-size: clamp(10px, 3.2vw, 12px);
		}
	}
</style>
