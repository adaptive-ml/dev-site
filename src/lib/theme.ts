import { writable, get } from 'svelte/store';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'rl-glossary-theme';

function readStored(): Theme | null {
	try {
		const value = localStorage.getItem(STORAGE_KEY);
		return value === 'dark' || value === 'light' ? value : null;
	} catch {
		return null;
	}
}

function readSystem(): Theme {
	if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(): Theme {
	return readStored() ?? readSystem();
}

function applyTheme(next: Theme): void {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', next);
}

export const theme = writable<Theme>(typeof window === 'undefined' ? 'dark' : resolveTheme());

export function initTheme(): void {
	if (typeof window === 'undefined') return;
	const initial = resolveTheme();
	theme.set(initial);
	applyTheme(initial);

	window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
		if (readStored()) return;
		const next: Theme = e.matches ? 'light' : 'dark';
		theme.set(next);
		applyTheme(next);
	});
}

export function toggleTheme(): void {
	const next: Theme = get(theme) === 'dark' ? 'light' : 'dark';
	theme.set(next);
	applyTheme(next);
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		return;
	}
}
