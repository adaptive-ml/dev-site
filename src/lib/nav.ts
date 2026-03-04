import { writable } from 'svelte/store';

export const navKey = writable(0);

export function restartPage() {
	navKey.update((n) => n + 1);
}
