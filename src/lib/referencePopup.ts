import { writable } from 'svelte/store';
import type { GlobalReference } from './references';

export const activeReference = writable<GlobalReference | null>(null);

export function openReference(ref: GlobalReference) {
	activeReference.set(ref);
}

export function closeReference() {
	activeReference.set(null);
}
