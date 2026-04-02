<script lang="ts">
	import '../app.css';
	import AdaptiveLogo from '$lib/components/AdaptiveLogo.svelte';
	import NavTree from '$lib/components/NavTree.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import ReferencePopup from '$lib/components/ReferencePopup.svelte';
	import GradientCanvas from '$lib/components/GradientCanvas.svelte';
	import geistLatinUrl from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
	import geistMonoLatinUrl from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
	import type { DomRectData } from '$lib/gradient';
	import { navKey } from '$lib/nav';
	import { getAdjacentEntries, getNode } from '$lib/data';
	import { page } from '$app/stores';
	import { goto, afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { children } = $props();

	let navCollapsed = $state(false);
	let mobileNavOpen = $state(false);
	let paletteOpen = $state(false);
	let gradientActive = $state(false);
	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let hasNavigated = $state(false);

	const isMobile = $derived(innerWidth <= 1024);

	const HEADER_H = 64;
	const NAV_W = 440;

	const MAX_DPR = 2;

	const ORIGIN = 'https://dev.adaptive-ml.com';
	const canonicalUrl = $derived(ORIGIN + $page.url.pathname);

	const basePath = resolve('/').slice(0, -1);
	const routePath = $derived($page.url.pathname.slice(basePath.length) || '/');
	const adjacent = $derived(getAdjacentEntries(routePath));
	const register = $derived(routePath === '/' ? 0.35 : 0.07);
	const isHome = $derived(routePath === '/');
	const currentNode = $derived.by(() => {
		if (isHome) return null;
		const segments = routePath.replace(/^\//, '').split('/');
		return getNode(segments);
	});

	let domRects = $derived.by((): DomRectData[] => {
		const dpr = typeof window !== 'undefined' ? Math.min(MAX_DPR, window.devicePixelRatio || 1) : 1;
		const headerH = HEADER_H * dpr;
		const navW = isMobile ? 0 : (navCollapsed ? 0 : NAV_W * dpr);
		const vw = innerWidth * dpr;
		const vh = innerHeight * dpr;

		return [
			{
				x: navW,
				y: headerH,
				w: vw - navW,
				h: vh - headerH,
				brightness: 0.4,
				cornerRadius: 0,
				invert: true,
			},
		];
	});

	afterNavigate(({ from }) => {
		if (from) hasNavigated = true;
	});

	$effect(() => {
		$page.url.pathname;
		mobileNavOpen = false;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			paletteOpen = !paletteOpen;
			return;
		}
		if (e.key === '\\' && (e.ctrlKey || e.metaKey) && !isMobile) {
			e.preventDefault();
			navCollapsed = !navCollapsed;
			return;
		}
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
				return;
			if (!adjacent.prev && !adjacent.next) return;
			const entry = e.key === 'ArrowLeft' ? adjacent.prev : adjacent.next;
			if (entry) {
				e.preventDefault();
				goto(resolve(`/${entry.path.join('/')}` as `/${string}`));
			}
		}
	}
</script>

<svelte:head>
	<link rel="preload" href={geistLatinUrl} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" href={geistMonoLatinUrl} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:url" content={canonicalUrl} />
</svelte:head>

<svelte:window onkeydown={handleKeydown} bind:innerWidth bind:innerHeight />

<div class="frame">
	<div class="gradient-layer">
		<GradientCanvas seed="rl-field-guide" {domRects} {register} bind:active={gradientActive} />
	</div>
	<header>
		<div class="header-left">
			<button class="menu-toggle" onclick={() => mobileNavOpen = !mobileNavOpen} aria-label="Toggle navigation">
				{#if mobileNavOpen}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<line x1="3" y1="3" x2="13" y2="13" />
						<line x1="13" y1="3" x2="3" y2="13" />
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<line x1="2" y1="4" x2="14" y2="4" />
						<line x1="2" y1="8" x2="14" y2="8" />
						<line x1="2" y1="12" x2="14" y2="12" />
					</svg>
				{/if}
			</button>
			<span class="menu-rule"></span>
			<a href="https://adaptive-ml.com" class="logo-link" aria-label="Adaptive ML">
				<AdaptiveLogo color="white" height={18} />
			</a>
			<span class="header-rule"></span>
			<a href={resolve('/')} class="header-title">RL Glossary</a>
		</div>
		<a href="https://www.adaptive-ml.com/contact-us" class="header-cta">Contact</a>
	</header>

	<div class="body">
		<div class="nav-overlay" class:open={mobileNavOpen}>
			<NavTree />
		</div>
		<div class="nav-col" class:collapsed={navCollapsed}>
			<NavTree />
		</div>
		<div class="nav-border" class:collapsed={navCollapsed} class:sdf={gradientActive}></div>
		<div class="viewport" class:sdf={gradientActive}>
			{#if !isHome}
				<div class="toolbar">
					{#if hasNavigated}
						<button class="back-btn" onclick={() => history.back()}>&larr; Back</button>
					{:else}
						<a class="back-btn" href={resolve('/')}>&larr; Home</a>
					{/if}
					{#if currentNode}
						<span class="toolbar-rule"></span>
						<span class="toolbar-title">{currentNode.title}</span>
						{#if currentNode.abbr}
							<span class="toolbar-abbr">{currentNode.abbr}</span>
						{/if}
					{/if}
				</div>
			{/if}
			{#key $navKey}
				{@render children()}
			{/key}
			<div class="viewport-footer">
			{#if adjacent.prev || adjacent.next}
				<nav class="page-nav">
					{#if adjacent.prev}
						<a href={resolve(`/${adjacent.prev.path.join('/')}` as `/${string}`)} class="nav-link nav-prev">
							<span class="nav-label">&larr; Previous</span>
							<span class="nav-title">{adjacent.prev.node.title}</span>
						</a>
					{/if}
					{#if adjacent.next}
						<a href={resolve(`/${adjacent.next.path.join('/')}` as `/${string}`)} class="nav-link nav-next">
							<span class="nav-label">Next &rarr;</span>
							<span class="nav-title">{adjacent.next.node.title}</span>
						</a>
					{/if}
				</nav>
			{/if}
			</div>
		</div>
	</div>
	<CommandPalette bind:open={paletteOpen} />
	<ReferencePopup />
</div>

<style>
	.frame {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.gradient-layer {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}

	header {
		position: relative;
		z-index: 1;
		height: var(--header-h);
		min-height: var(--header-h);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.logo-link {
		display: inline-flex;
		align-items: center;
	}

	.header-rule {
		width: 1px;
		height: 24px;
		background: var(--rule);
	}

	.header-title {
		font-size: 14px;
		font-weight: 500;
		letter-spacing: 0.01em;
		color: var(--text-body);
	}

	.header-cta {
		font-family: var(--font-mono);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--void);
		background: var(--text);
		padding: 6px 16px;
		border: 1px solid var(--text);
		border-radius: 4px;
		font-weight: 500;
		transition: border-radius 200ms ease;
	}

	.header-cta:hover {
		border-radius: 18px;
	}

	.body {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.nav-col {
		width: var(--nav-w);
		min-width: var(--nav-w);
		overflow: hidden;
		transition: width 200ms ease, min-width 200ms ease;
	}

	.nav-col.collapsed {
		width: 0;
		min-width: 0;
	}

	.nav-border {
		width: 1px;
		background: var(--rule);
		flex-shrink: 0;
		transition: opacity 200ms ease;
	}

	.nav-border.collapsed,
	.nav-border.sdf {
		opacity: 0;
	}

	.viewport {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-top: 1px solid var(--rule);
	}

	.viewport.sdf {
		border-top-color: transparent;
	}

	.toolbar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 24px 48px;
	}

	.toolbar-rule {
		width: 1px;
		height: 16px;
		background: var(--rule);
	}

	.toolbar-title {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: var(--text-body);
	}

	.toolbar-abbr {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		border: 1px solid var(--rule);
		border-radius: 4px;
		padding: 2px 6px;
	}

	.back-btn {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline transparent;
		text-underline-offset: 3px;
		transition: color 150ms ease, text-decoration-color 200ms ease;
	}

	.back-btn:hover {
		color: var(--text-body);
		text-decoration-color: var(--text-body);
	}

	.viewport-footer {
		flex-shrink: 0;
	}

	.page-nav {
		flex-shrink: 0;
		display: flex;
		justify-content: space-between;
		padding: 24px 48px;
	}

	.nav-link {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px 16px;
		border: 1px solid transparent;
		border-radius: 4px;
		transition: border-color 150ms ease, border-radius 200ms ease;
	}

	.nav-link:hover {
		border-color: var(--rule);
		border-radius: 18px;
	}

	.nav-prev {
		text-align: left;
		margin-right: auto;
	}

	.nav-next {
		text-align: right;
		margin-left: auto;
	}

	.nav-label {
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.nav-title {
		font-size: 14px;
		color: var(--text-body);
		transition: color 150ms ease;
	}

	.nav-link:hover .nav-title {
		color: var(--text);
	}

	/* ---- menu toggle (mobile only) ---- */

	.menu-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 8px;
		margin: -8px;
		color: var(--text-body);
		cursor: pointer;
	}

	.menu-rule {
		display: none;
	}

	/* ---- nav overlay (mobile only) ---- */

	.nav-overlay {
		display: none;
	}

	/* ---- mobile ---- */

	@media (max-width: 1024px) {
		.menu-toggle {
			display: flex;
		}

		.menu-rule {
			display: block;
			width: 1px;
			height: 24px;
			background: var(--rule);
		}

		.header-rule,
		.header-title {
			display: none;
		}

		.nav-col,
		.nav-border {
			display: none;
		}

		.nav-overlay {
			display: none;
			position: absolute;
			inset: 0;
			background: var(--void);
			z-index: 10;
			overflow-y: auto;
		}

		.nav-overlay.open {
			display: block;
		}

		.page-nav {
			padding: 16px 20px 32px;
		}
	}
</style>
