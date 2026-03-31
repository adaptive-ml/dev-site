<script lang="ts">
	import { activeReference, closeReference } from '$lib/referencePopup';
	import { globalReferences } from '$lib/references';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { restartPage } from '$lib/nav';

	let activeId = $state<number | null>(null);
	let expandedId = $state<number | null>(null);
	let listEl = $state<HTMLElement>();

	$effect(() => {
		const unsub = activeReference.subscribe((v) => {
			activeId = v?.id ?? null;
			expandedId = v?.id ?? null;
		});
		return unsub;
	});

	$effect(() => {
		if (activeId && listEl) {
			requestAnimationFrame(() => {
				const el = listEl?.querySelector(`[data-ref="${activeId}"]`);
				el?.scrollIntoView({ block: 'center' });
			});
		}
	});

	function toggle(id: number) {
		expandedId = expandedId === id ? null : id;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeReference();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!activeId) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeReference();
		}
	}

	function navigateTo(path: string) {
		closeReference();
		restartPage();
		goto(base + '/' + path);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if activeId !== null}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="panel" role="dialog" aria-modal="true" aria-label="All references">
			<div class="panel-header">
				<span class="panel-label">References</span>
			</div>

			<div class="divider"></div>

			<div class="ref-list" bind:this={listEl}>
				{#each globalReferences as ref}
					{@const isExpanded = expandedId === ref.id}
					{@const isActive = activeId === ref.id}
					<div class="ref-row" class:active={isActive} data-ref={ref.id}>
						<div class="ref-header">
							<button class="ref-expand" onclick={() => toggle(ref.id)} aria-label="Show citing pages">
								<svg
									class="chevron"
									class:open={isExpanded}
									width="10" height="10"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M6 4l4 4-4 4" />
								</svg>
							</button>
							<span class="ref-id">{ref.id}</span>
							<div class="ref-text">
								<a href={ref.url} target="_blank" rel="noopener noreferrer" class="ref-title">
									{ref.title}
								</a>
								{#if ref.authors}
									<span class="ref-authors">{ref.authors}</span>
								{/if}
							</div>
						</div>
						{#if isExpanded}
							<div class="ref-cited">
								{#each ref.citedBy as cite}
									{@const segments = cite.path.split('/')}
									{@const breadcrumb = segments.length > 1 ? segments.slice(0, -1).join(' / ') : ''}
									<button class="cite-link" onclick={() => navigateTo(cite.path)}>
										<span class="cite-title">{cite.title}</span>
										{#if breadcrumb}
											<span class="cite-breadcrumb">{breadcrumb}</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
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

	.panel {
		width: min(540px, calc(100vw - 32px));
		max-height: min(520px, 65vh);
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

	.panel-header {
		display: flex;
		align-items: center;
		padding: 16px 20px;
		flex-shrink: 0;
	}

	.panel-label {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.divider {
		height: 1px;
		background: var(--rule);
		flex-shrink: 0;
	}

	.ref-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.ref-row {
		border-radius: 6px;
		transition: background 80ms ease;
	}

	.ref-row.active {
		background: rgba(255, 255, 255, 0.05);
	}

	.ref-header {
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 8px 12px;
	}

	.ref-expand {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: var(--text-faint);
		transition: color 150ms ease;
		position: relative;
		top: 1px;
	}

	.ref-expand:hover {
		color: var(--text-muted);
	}

	.chevron {
		transition: transform 200ms ease;
	}

	.chevron.open {
		transform: rotate(90deg);
	}

	.ref-id {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		min-width: 18px;
	}

	.ref-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ref-title {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-dim);
		line-height: 1.5;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 3px;
		transition: color 150ms ease, text-decoration-color 150ms ease;
	}

	.ref-title:hover {
		color: var(--text);
		text-decoration-color: var(--rule);
	}

	.ref-authors {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		line-height: 1.4;
	}

	.ref-cited {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 2px 12px 10px 34px;
		margin-left: 19px;
		border-left: 1px solid var(--rule);
	}

	.cite-link {
		display: flex;
		align-items: center;
		gap: 10px;
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 6px 10px;
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}

	.cite-link:hover {
		border-color: var(--rule);
		border-radius: 18px;
	}

	.cite-title {
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text-dim);
		transition: color 150ms ease;
	}

	.cite-link:hover .cite-title {
		color: var(--text);
	}

	.cite-breadcrumb {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		margin-left: auto;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
		min-width: 0;
	}

	@media (max-width: 640px) {
		.backdrop {
			padding-top: 16px;
		}

		.ref-header {
			padding: 8px 8px;
		}

		.ref-cited {
			padding: 4px 8px 12px 24px;
			margin-left: 16px;
			gap: 4px;
		}

		.cite-link {
			flex-direction: column;
			align-items: flex-start;
			gap: 2px;
			padding: 10px 12px;
			min-height: 44px;
			border-color: var(--rule);
		}

		.cite-title {
			font-size: 14px;
		}

		.cite-breadcrumb {
			font-size: 10px;
		}
	}
</style>
