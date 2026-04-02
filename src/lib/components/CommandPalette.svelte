<script lang="ts">
	import { flatNodes } from '$lib/data';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { restartPage } from '$lib/nav';
	import { modKey } from '$lib/platform';
	import Fuse from 'fuse.js';

	let { open = $bindable(false) } = $props();

	let mod = $state('');
	$effect(() => { mod = modKey(); });

	let search = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement>();
	let listEl = $state<HTMLElement>();

	const allNodes = flatNodes();
	const fuse = new Fuse(allNodes, {
		keys: ['node.title', 'node.abbr'],
		threshold: 0.4,
		distance: 100,
	});

	const basePath = resolve('/').slice(0, -1);
	const currentPath = $derived($page.url.pathname.slice(basePath.length).replace(/^\//, '') || '');

	const results = $derived.by(() => {
		const q = search.trim();
		if (!q) return allNodes;
		return fuse.search(q).map((r) => r.item);
	});

	$effect(() => {
		if (open) {
			search = '';
			selectedIndex = 0;
			// wait for DOM
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	// reset selection when results change
	$effect(() => {
		results;
		selectedIndex = 0;
	});

	function close() {
		open = false;
	}

	function navigate(entry: (typeof allNodes)[0]) {
		const href = resolve(`/${entry.path.join('/')}` as `/${string}`);
		close();
		restartPage();
		goto(href);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
			scrollToSelected();
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
			scrollToSelected();
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const entry = results[selectedIndex];
			if (entry) navigate(entry);
			return;
		}
	}

	function scrollToSelected() {
		requestAnimationFrame(() => {
			const item = listEl?.querySelector(`[data-index="${selectedIndex}"]`);
			item?.scrollIntoView({ block: 'nearest' });
		});
	}

	function breadcrumb(path: string[]): string {
		if (path.length <= 1) return '';
		return path.slice(0, -1).join(' / ');
	}

	function isCurrentPage(entry: (typeof allNodes)[0]): boolean {
		return entry.path.join('/') === currentPath;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="palette" role="dialog" aria-modal="true" aria-label="Search glossary">
			<div class="input-row">
				<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={search}
					type="text"
					placeholder="Search glossary…"
					class="input"
					spellcheck="false"
					autocomplete="off"
				/>
				<kbd class="esc-hint">esc</kbd>
			</div>

			<div class="divider"></div>

			<div class="results" bind:this={listEl}>
				{#if results.length === 0}
					<div class="empty">No results for "{search}"</div>
				{:else}
					{#each results as entry, i}
						{@const selected = i === selectedIndex}
						{@const current = isCurrentPage(entry)}
						{@const crumb = breadcrumb(entry.path)}
						<button
							type="button"
							class="result"
							class:selected
							class:current
							data-index={i}
							onclick={() => navigate(entry)}
							onmouseenter={() => selectedIndex = i}
						>
							<span class="result-title">{entry.node.title}</span>
							{#if entry.node.abbr}
								<span class="result-abbr">{entry.node.abbr}</span>
							{/if}
							{#if crumb}
								<span class="result-breadcrumb">{crumb}</span>
							{/if}
							{#if current}
								<span class="current-badge">current</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<div class="divider"></div>

			<div class="footer">
				<span class="footer-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
				<span class="footer-hint"><kbd>↵</kbd> open</span>
				<span class="footer-hint"><kbd>esc</kbd> close</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: min(20vh, 160px);
		animation: fadeIn 120ms ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: scale(0.97) translateY(-8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.palette {
		width: min(580px, calc(100vw - 32px));
		max-height: min(480px, 60vh);
		display: flex;
		flex-direction: column;
		background: rgba(10, 10, 12, 0.95);
		border: 1px solid var(--rule);
		border-radius: 12px;
		overflow: hidden;
		animation: slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.06),
			0 16px 70px rgba(0, 0, 0, 0.6);
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px;
	}

	.search-icon {
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.input {
		flex: 1;
		font-family: var(--font-body);
		font-size: 16px;
		color: var(--text);
		background: none;
		border: none;
		outline: none;
		caret-color: var(--text);
	}

	.input::placeholder {
		color: var(--text-faint);
	}

	.esc-hint {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-faint);
		border: 1px solid var(--text-faint);
		border-radius: 4px;
		padding: 2px 6px;
		line-height: 1.4;
	}

	.divider {
		height: 1px;
		background: var(--rule);
		flex-shrink: 0;
	}

	.results {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.result {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		border: none;
		background: none;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
		transition: background 80ms ease;
	}

	.result.selected {
		background: rgba(255, 255, 255, 0.08);
	}

	.result.selected .result-title {
		color: var(--text);
	}

	.result-title {
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--text-body);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-abbr {
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

	.result-breadcrumb {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-left: auto;
	}

	.current-badge {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		border: 1px solid var(--text-faint);
		border-radius: 3px;
		padding: 1px 5px;
		line-height: 1.4;
	}

	.empty {
		padding: 24px 12px;
		font-size: 14px;
		color: var(--text-muted);
		text-align: center;
	}

	.footer {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 20px;
	}

	.footer-hint {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.footer-hint kbd {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		border: 1px solid var(--text-faint);
		border-radius: 3px;
		padding: 1px 4px;
		line-height: 1.4;
	}

	@media (max-width: 640px) {
		.backdrop {
			padding-top: 16px;
			align-items: flex-start;
		}

		.palette {
			max-height: calc(100vh - 32px);
			border-radius: 12px;
		}

		.footer {
			display: none;
		}
	}
</style>
