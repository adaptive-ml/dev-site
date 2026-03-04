export function isMac(): boolean {
	if (typeof navigator === 'undefined') return false;
	return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}

export function modKey(): string {
	return isMac() ? '⌘' : 'Ctrl';
}
