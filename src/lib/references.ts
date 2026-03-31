import { flatNodes } from './data';

export interface GlobalReference {
	id: number;
	title: string;
	url: string;
	authors?: string;
	citedBy: { path: string; title: string }[];
}

function normalizeUrl(url: string): string {
	try {
		const u = new URL(url);
		u.hostname = u.hostname.toLowerCase();
		let p = u.pathname;
		if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
		return u.protocol + '//' + u.hostname + p + u.search + u.hash;
	} catch {
		return url.toLowerCase().replace(/\/$/, '');
	}
}

interface RefAccum {
	title: string;
	url: string;
	authors?: string;
	citedBy: Map<string, string>;
}

const allNodes = flatNodes();
const refMap = new Map<string, RefAccum>();
const pageSourceOrder = new Map<string, string[]>();

for (const { path, node } of allNodes) {
	if (!node.sources?.length) continue;
	const pagePath = path.join('/');
	const urls: string[] = [];
	for (const source of node.sources) {
		const key = normalizeUrl(source.url);
		urls.push(key);
		const existing = refMap.get(key);
		if (existing) {
			existing.citedBy.set(pagePath, node.title);
		} else {
			refMap.set(key, {
				title: source.title,
				url: source.url,
				authors: source.authors,
				citedBy: new Map([[pagePath, node.title]]),
			});
		}
	}
	pageSourceOrder.set(pagePath, urls);
}

// Sort by URL for stable numbering
const sorted = [...refMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

const byUrl = new Map<string, GlobalReference>();
export const globalReferences: GlobalReference[] = sorted.map(([key, acc], i) => {
	const ref: GlobalReference = {
		id: i + 1,
		title: acc.title,
		url: acc.url,
		authors: acc.authors,
		citedBy: [...acc.citedBy.entries()].map(([path, title]) => ({ path, title })),
	};
	byUrl.set(key, ref);
	return ref;
});

export function getPageRefs(pagePath: string): GlobalReference[] {
	const urls = pageSourceOrder.get(pagePath);
	if (!urls) return [];
	return urls.map((u) => byUrl.get(u)).filter((r): r is GlobalReference => !!r);
}
