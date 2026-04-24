<script lang="ts">
	import { tree, flatNodes, type TreeNode } from '$lib/data';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { restartPage } from '$lib/nav';
	import { modKey } from '$lib/platform';
	import Fuse from 'fuse.js';

	let mod = $state('');
	$effect(() => { mod = modKey(); });

	const currentPath = $derived($page.params?.path ?? '');
	const urlBase = resolve('/').slice(0, -1);
	const routePath = $derived($page.url.pathname.slice(urlBase.length) || '/');
	const isHome = $derived(routePath === '/');
	const activeSegments = $derived(currentPath ? currentPath.split('/') : []);

	let expanded = $state(new Set<string>());
	let search = $state('');
	let searchInput: HTMLInputElement;
	let prevPath = '';

	const allNodes = flatNodes();
	const fuse = new Fuse(allNodes, {
		keys: ['node.title', 'node.abbr'],
		threshold: 0.4,
		distance: 100,
	});

	const searchResults = $derived.by(() => {
		const q = search.trim();
		if (!q) return null;
		return fuse.search(q).map((r) => r.item);
	});

	$effect(() => {
		const path = activeSegments.join('/');
		if (path === prevPath) return;
		prevPath = path;
		const next = new Set(expanded);
		for (let i = 1; i <= activeSegments.length; i++) {
			next.add(activeSegments.slice(0, i).join('/'));
		}
		expanded = next;
	});

	function toggle(fullPath: string) {
		const next = new Set(expanded);
		if (next.has(fullPath)) {
			next.delete(fullPath);
		} else {
			next.add(fullPath);
		}
		expanded = next;
	}

	function handleLinkClick(e: MouseEvent, fullPath: string, hasChildren: boolean, active: boolean) {
		if (active && hasChildren) {
			e.preventDefault();
			toggle(fullPath);
		} else {
			restartPage();
		}
	}

	function isActive(fullPath: string): boolean {
		return fullPath === activeSegments.join('/');
	}

	function breadcrumb(path: string[]): string {
		const titles: string[] = [];
		let nodes = tree;
		for (const seg of path) {
			const node = nodes.find((n) => n.slug === seg);
			if (!node) break;
			titles.push(node.title);
			nodes = node.children ?? [];
		}
		return titles.join(' → ');
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			search = '';
			searchInput?.blur();
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
		if (e.key === '/') {
			e.preventDefault();
			searchInput?.focus();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#snippet renderNodes(nodes: TreeNode[], basePath: string, depth: number)}
	{#each nodes as node, i}
		{@const fullPath = basePath ? `${basePath}/${node.slug}` : node.slug}
		{@const active = isActive(fullPath)}
		{@const isLast = i === nodes.length - 1}
		{@const isExpanded = expanded.has(fullPath)}
		{@const hasChildren = !!node.children?.length}
		{@const showChildren = hasChildren && isExpanded}
		{@const onPath = fullPath === currentPath || currentPath.startsWith(fullPath + '/')}
		<li class="node" class:last={isLast} class:active class:on-path={onPath}>
			<div class="link-row">
				<a
					href={resolve(`/${fullPath}` as `/${string}`)}
					class="link"
					class:active
					onclick={(e: MouseEvent) => handleLinkClick(e, fullPath, hasChildren, active)}
				>
					<span class="label">{node.title}</span>
					{#if node.abbr}
						<span class="abbr">{node.abbr}</span>
					{/if}
					{#if hasChildren}
						<span class="toggle-indicator" aria-hidden="true"
						>{isExpanded ? '−' : '+'}</span>
					{/if}
				</a>
			</div>
			{#if showChildren}
				<div class="branch">
					<button
						class="trunk"
						onclick={() => toggle(fullPath)}
						aria-label="Collapse section"
					></button>
					<ul class="children">
						{@render renderNodes(node.children!, fullPath, depth + 1)}
					</ul>
				</div>
			{/if}
		</li>
	{/each}
{/snippet}

<nav class="nav">
	<div class="search-bar">
		<input
			bind:this={searchInput}
			bind:value={search}
			onkeydown={handleSearchKeydown}
			type="text"
			placeholder="Search…"
			class="search-input"
			spellcheck="false"
		/>
		{#if search}
			<button class="search-clear" onclick={() => { search = ''; searchInput?.focus(); }}>×</button>
		{:else if mod}
			<span class="search-shortcut">
				<kbd>{mod}</kbd><kbd>K</kbd>
			</span>
		{/if}
	</div>

	{#if searchResults}
		<ul class="search-results">
			{#each searchResults as entry}
				{@const href = resolve(`/${entry.path.join('/')}` as `/${string}`)}
				{@const active = isActive(entry.path.join('/'))}
				<li>
					<a {href} class="search-result" class:active onclick={restartPage}>
						<span class="search-result-title">{entry.node.title}</span>
						<span class="search-result-breadcrumb">{breadcrumb(entry.path)}</span>
					</a>
				</li>
			{/each}
			{#if searchResults.length === 0}
				<li class="search-empty">No results</li>
			{/if}
		</ul>
	{:else}
		<div class="root">
			<a href={resolve('/')} class="link" class:active={isHome} onclick={restartPage}>
				<span class="label">Home</span>
			</a>
			<div class="branch">
				<ul class="children">
					{@render renderNodes(tree, '', 0)}
				</ul>
			</div>
		</div>
	{/if}
</nav>

<style>
	.nav {
		--tree: var(--text-faint);
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 24px 16px;
	}

	/* ---- search ---- */
	.search-bar {
		position: relative;
		margin-bottom: 12px;
		flex-shrink: 0;
		padding: 0 12px;
	}

	.search-input {
		width: 100%;
		padding: 6px 24px 6px 0;
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-body);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--rule);
		border-radius: 0;
		outline: none;
		transition: border-color 150ms ease;
	}

	.search-input::placeholder {
		font-family: var(--font-mono);
		color: var(--text-muted);
		font-size: 11px;
	}

	.search-input:focus {
		border-bottom-color: var(--text-muted);
	}

	.search-clear {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--text-faint);
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		padding: 2px 4px;
	}

	.search-clear:hover {
		color: var(--text-body);
	}

	.search-shortcut {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 3px;
		pointer-events: none;
	}

	.search-shortcut kbd {
		font-family: var(--font-mono);
		font-size: 10px;
		line-height: 1;
		color: var(--text-faint);
		border: 1px solid var(--text-faint);
		border-radius: 3px;
		padding: 2px 4px;
		min-width: 16px;
		text-align: center;
	}

	/* ---- search results ---- */
	.search-results {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.search-result {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 12px;
		border: 1px solid transparent;
		border-radius: 4px;
		transition: border-radius 200ms ease, border-color 150ms ease, background 150ms ease;
	}

	.search-result:hover {
		border-color: var(--rule);
		border-radius: 18px;
	}

	.search-result.active {
		background: var(--text);
		color: var(--void);
		border-color: var(--text);
	}

	.search-result-title {
		font-size: 14px;
		color: var(--text-body);
	}

	.search-result.active .search-result-title {
		color: var(--void);
		font-weight: 600;
	}

	.search-result-breadcrumb {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.search-result.active .search-result-breadcrumb {
		color: var(--void);
		opacity: 0.6;
	}

	.search-empty {
		padding: 8px 12px;
		font-size: 13px;
		color: var(--text-muted);
	}

	/* ---- root (Home as tree root) ---- */
	.root {
		display: flex;
		flex-direction: column;
	}

	.root > .branch {
		margin-top: 12px;
	}

	/* extend first child's L-connector up to bridge the gap to Home */
	.root > .branch > .children > .node:first-child::before {
		top: -12px;
		height: calc(18px + 12px);
	}

	/* extend first child's L-connector up to bridge the gap to parent */
	.node > .branch > .children > .node:first-child::before {
		top: -6px;
		height: calc(18px + 6px);
	}

	/* ---- node ---- */
	.node {
		position: relative;
		list-style: none;
	}

	/* ---- link row: link + toggle ---- */
	.link-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	/* ---- link ---- */
	.link {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 0;
		padding: 6px 12px;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-body);
		border: 1px solid transparent;
		border-radius: 4px;
		transition: border-radius 200ms ease, border-color 150ms ease, background 150ms ease;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.abbr {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		border: 1px solid var(--rule);
		border-radius: 3px;
		padding: 1px 4px;
	}

	.link:hover {
		border-color: var(--rule);
		border-radius: 18px;
	}

	.link.active {
		background: var(--text);
		color: var(--void);
		font-weight: 600;
		border-color: var(--text);
	}

	.link.active .abbr {
		color: var(--void);
		border-color: var(--inverted-border);
	}

	/* ---- toggle indicator (inside link) ---- */
	.toggle-indicator {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 16px;
		line-height: 1;
		color: var(--text-faint);
		transition: color 150ms ease;
	}

	.link:hover .toggle-indicator {
		color: var(--text-body);
	}

	/* active link is inverted (white bg, black text) — near-void, barely there */
	.link.active .toggle-indicator {
		color: var(--text-faint);
	}

	.link.active:hover .toggle-indicator {
		color: var(--text-muted);
	}

	/* ---- branch: trunk + children ---- */
	.branch {
		position: relative;
		margin-top: 6px;
	}

	/* clickable trunk overlay — covers the tree line area */
	.trunk {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 16px;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		z-index: 1;
	}

	/* ---- children ---- */
	.children {
		list-style: none;
		margin: 0;
		padding: 0 0 0 8px;
	}

	/* tree lines on child nodes */
	.children > .node {
		border-left: 1px solid var(--tree);
		padding-left: 14px;
		transition: border-color 200ms ease;
	}
	.children > .node.last {
		border-left-color: transparent;
		padding-bottom: 6px;
	}

	/* L-connector */
	.children > .node::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 0;
		width: 14px;
		height: 18px;
		border-left: 1px solid var(--tree);
		border-bottom: 1px solid var(--tree);
		border-bottom-left-radius: 4px;
		transition: border-bottom-left-radius 200ms ease, border-color 200ms ease;
		pointer-events: none;
	}

	.children > .node:hover::before {
		border-bottom-left-radius: 12px;
	}
	.children > .node.active::before {
		border-bottom-left-radius: 16px;
	}

	/* ---- active path illumination ---- */

	/* on-path node's L-connector: illuminated */
	.children > .node.on-path::before {
		border-left-color: var(--text);
		border-bottom-color: var(--text);
	}

	/* vertical trunk: nodes before the on-path node */
	.children > .node:has(~ .on-path) {
		border-left-color: var(--text);
	}
	.children > .node:has(~ .on-path)::before {
		border-left-color: var(--text);
	}

	/* trunk hover: brighten tree lines */
	.branch:has(.trunk:hover) > .children > .node {
		border-left-color: var(--text-body);
	}
	.branch:has(.trunk:hover) > .children > .node.last {
		border-left-color: transparent;
	}
	.branch:has(.trunk:hover) > .children > .node::before {
		border-left-color: var(--text-body);
		border-bottom-color: var(--text-body);
	}

	@media (max-width: 1024px) {
		.link {
			padding: 10px 12px;
		}
	}
</style>
