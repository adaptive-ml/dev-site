<script lang="ts">
	import { Combobox } from 'bits-ui';
	import Fuse from 'fuse.js';
	import { MODEL_DATABASE, type ModelEntry } from '$lib/cost-engine';

	let {
		specialist = null,
		isMobile = false,
		onselect,
	}: {
		specialist: ModelEntry | null;
		isMobile: boolean;
		onselect: (model: ModelEntry) => void;
	} = $props();

	let inputValue = $state('');
	let open = $state(false);
	let sheetOpen = $state(false);

	const fuse = new Fuse(MODEL_DATABASE, { keys: ['name', 'vendor'], threshold: 0.4, distance: 100 });

	const filtered = $derived(
		inputValue.length >= 2
			? fuse.search(inputValue).map(r => r.item)
			: [...MODEL_DATABASE.filter(m => m.primary), ...MODEL_DATABASE.filter(m => !m.primary)]
	);

	const primaryModels = $derived(filtered.filter(m => m.primary));
	const otherModels = $derived(filtered.filter(m => !m.primary));

	function handleSelect(value: string | undefined) {
		if (!value) return;
		const model = MODEL_DATABASE.find(m => m.name === value);
		if (model) {
			onselect(model);
			open = false;
			sheetOpen = false;
			inputValue = '';
		}
	}

	function closeSheet() {
		sheetOpen = false;
		inputValue = '';
	}
</script>

{#if isMobile}
	<!-- Mobile: button trigger + bottom sheet -->
	<button class="mobile-trigger" onclick={() => { sheetOpen = true; }}>
		{#if specialist}
			<span class="trigger-name">{specialist.name}</span>
			<span class="trigger-meta">
				{#if specialist.isMoE}{specialist.activeParamsB}B / {specialist.totalParamsB}B MoE{:else}{specialist.activeParamsB}B{/if}
			</span>
		{:else}
			<span class="trigger-placeholder">select a model</span>
		{/if}
		<span class="trigger-caret">▾</span>
	</button>

	{#if sheetOpen}
		<div class="sheet-backdrop" onclick={closeSheet} role="presentation"></div>
		<div class="sheet">
			<div class="sheet-handle"></div>
			<div class="sheet-search-row">
				<input
					class="sheet-search"
					type="text"
					placeholder="search models..."
					bind:value={inputValue}
					enterkeyhint="done"
				/>
			</div>
			<div class="sheet-list">
				{#each primaryModels as m (m.name)}
					<button
						class="sheet-item"
						class:selected={specialist?.name === m.name}
						onclick={() => handleSelect(m.name)}
					>
						<span class="sheet-item-top">
							<span class="item-name"><span class="item-star">★</span> {m.name}</span>
							{#if m.suited}<span class="item-suited">{m.suited}</span>{/if}
						</span>
						<span class="sheet-item-meta">
							{#if m.isMoE}{m.activeParamsB}B / {m.totalParamsB}B MoE{:else}{m.activeParamsB}B{/if}
						</span>
					</button>
				{/each}
				{#if primaryModels.length > 0 && otherModels.length > 0 && !inputValue}
					<div class="combo-divider"></div>
				{/if}
				{#each otherModels as m (m.name)}
					<button
						class="sheet-item"
						class:selected={specialist?.name === m.name}
						onclick={() => handleSelect(m.name)}
					>
						<span class="sheet-item-top">
							<span class="item-name">{m.name}</span>
							{#if m.suited}<span class="item-suited">{m.suited}</span>{/if}
						</span>
						<span class="sheet-item-meta">
							{#if m.isMoE}{m.activeParamsB}B / {m.totalParamsB}B MoE{:else}{m.activeParamsB}B{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
{:else}
	<!-- Desktop: bits-ui combobox -->
	<Combobox.Root
		type="single"
		value={specialist?.name ?? ''}
		onValueChange={handleSelect}
		bind:open
	>
		<div class="combo-wrapper">
			<Combobox.Input
				class="combo-input"
				placeholder={specialist ? specialist.name : 'search models...'}
				onclick={() => { open = true; }}
				oninput={(e) => { inputValue = e.currentTarget.value; }}
			/>
			{#if specialist && !open}
				<span class="combo-meta">
					{#if specialist.isMoE}{specialist.activeParamsB}B / {specialist.totalParamsB}B MoE{:else}{specialist.activeParamsB}B{/if}
				</span>
			{/if}
		</div>

		<Combobox.Content class="combo-dropdown" sideOffset={0} align="start" side="bottom">
			{#each primaryModels as m (m.name)}
				<Combobox.Item value={m.name} label={m.name} class="combo-item {specialist?.name === m.name ? 'selected' : ''}">
					<span class="item-name"><span class="item-star">★</span> {m.name}</span>
					<span class="item-right">
						<span class="item-meta">{#if m.isMoE}{m.activeParamsB}B / {m.totalParamsB}B MoE{:else}{m.activeParamsB}B{/if}</span>
						{#if m.suited}<span class="item-suited">{m.suited}</span>{/if}
						<a class="item-hf" href={m.url} target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()}>HF ↗</a>
					</span>
				</Combobox.Item>
			{/each}
			{#if primaryModels.length > 0 && otherModels.length > 0 && !inputValue}
				<div class="combo-divider"></div>
			{/if}
			{#each otherModels as m (m.name)}
				<Combobox.Item value={m.name} label={m.name} class="combo-item {specialist?.name === m.name ? 'selected' : ''}">
					<span class="item-name">{m.name}</span>
					<span class="item-right">
						<span class="item-meta">{#if m.isMoE}{m.activeParamsB}B / {m.totalParamsB}B MoE{:else}{m.activeParamsB}B{/if}</span>
						{#if m.suited}<span class="item-suited">{m.suited}</span>{/if}
						<a class="item-hf" href={m.url} target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()}>HF ↗</a>
					</span>
				</Combobox.Item>
			{/each}
		</Combobox.Content>
	</Combobox.Root>
{/if}

<style>
	/* === Mobile trigger button === */
	.mobile-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 12px 14px;
		background: rgba(10, 10, 12, 0.8);
		border: 1px solid var(--rule);
		border-radius: 6px;
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 14px;
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease;
		gap: 8px;
	}
	.mobile-trigger:active { border-color: var(--text-muted); }
	.trigger-name { font-weight: 500; color: var(--text); flex: 1; }
	.trigger-meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
	.trigger-placeholder { color: var(--text-faint); flex: 1; }
	.trigger-caret { color: var(--text-faint); font-size: 11px; }

	/* === Desktop combo input === */
	.combo-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	:global(.combo-input) {
		width: 100%;
		padding: 10px 12px;
		background: rgba(10, 10, 12, 0.8);
		border: 1px solid var(--rule);
		border-radius: 6px;
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 14px;
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease;
		outline: none;
	}

	:global(.combo-input):hover { border-color: var(--text-muted); }
	:global(.combo-input):focus { border-color: var(--text-muted); }
	:global(.combo-input)::placeholder { color: var(--text-muted); }

	.combo-meta {
		position: absolute;
		right: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		pointer-events: none;
	}

	/* === Desktop dropdown === */
	:global(.combo-dropdown) {
		background: rgba(10, 10, 12, 0.95);
		border: 1px solid var(--rule);
		border-top: none;
		border-radius: 0 0 6px 6px;
		max-height: 280px;
		overflow-y: auto;
		z-index: 50;
	}

	:global(.combo-item) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		transition: background 100ms ease;
	}
	:global(.combo-item:hover),
	:global(.combo-item[data-highlighted]) {
		background: rgba(255, 255, 255, 0.05);
	}
	:global(.combo-item.selected) { color: var(--text); }

	.item-name { display: flex; align-items: center; gap: 4px; }
	.item-star { color: var(--text-muted); font-size: 10px; }
	.item-right { display: flex; align-items: center; gap: 8px; }
	.item-meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
	.item-suited { font-size: 11px; color: var(--text-faint); }
	.item-hf {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-faint);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.item-hf:hover { color: var(--text-muted); }

	.combo-divider { height: 1px; background: var(--rule); margin: 4px 12px; }

	/* === Mobile bottom sheet === */
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 100;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 101;
		background: rgba(10, 10, 12, 0.95);
		border-top: 1px solid var(--rule);
		border-radius: 12px 12px 0 0;
		display: flex;
		flex-direction: column;
		max-height: 70vh;
		animation: sheetUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes sheetUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.sheet-handle {
		width: 32px;
		height: 4px;
		border-radius: 2px;
		background: var(--text-faint);
		margin: 8px auto;
		flex-shrink: 0;
	}

	.sheet-search-row {
		padding: 4px 12px 8px;
		flex-shrink: 0;
	}

	.sheet-search {
		width: 100%;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--rule);
		border-radius: 8px;
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 16px;
		outline: none;
	}
	.sheet-search::placeholder { color: var(--text-faint); }
	.sheet-search:focus { border-color: var(--text-muted); }

	.sheet-list {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding-bottom: env(safe-area-inset-bottom, 16px);
	}

	.sheet-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 12px 16px;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: var(--text-body);
		font-family: var(--font-body);
		font-size: 14px;
		cursor: pointer;
		text-align: left;
	}
	.sheet-item.selected { color: var(--text); }
	.sheet-item:active { background: rgba(255, 255, 255, 0.05); }

	.sheet-item-top {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.sheet-item-meta {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}
</style>
