<script lang="ts">
	import { theme, toggleTheme } from '$lib/theme';
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggleTheme}
	aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if $theme === 'dark'}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M13 9.2A5 5 0 0 1 6.8 3a5.2 5.2 0 1 0 6.2 6.2Z" />
		</svg>
	{:else}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="8" cy="8" r="3" />
			<line x1="8" y1="1.5" x2="8" y2="3" />
			<line x1="8" y1="13" x2="8" y2="14.5" />
			<line x1="1.5" y1="8" x2="3" y2="8" />
			<line x1="13" y1="8" x2="14.5" y2="8" />
			<line x1="3.3" y1="3.3" x2="4.3" y2="4.3" />
			<line x1="11.7" y1="11.7" x2="12.7" y2="12.7" />
			<line x1="3.3" y1="12.7" x2="4.3" y2="11.7" />
			<line x1="11.7" y1="4.3" x2="12.7" y2="3.3" />
		</svg>
	{/if}
</button>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		color: var(--text-body);
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease, border-radius 200ms ease;
	}

	.theme-toggle:hover {
		color: var(--text);
		border-color: var(--rule);
		border-radius: 18px;
	}

	.theme-toggle:focus-visible {
		outline: none;
		border-color: var(--rule-strong);
	}
</style>
