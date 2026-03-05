import type { Component } from 'svelte';

export interface TreeNode {
	slug: string;
	title: string;
	component?: Component;
	children?: TreeNode[];
}

interface MdModule {
	default: Component;
	metadata: { title: string; order?: number };
}

const modules = import.meta.glob<MdModule>('/content/**/*.md', { eager: true });

function buildTree(): TreeNode[] {
	const nodeMap = new Map<string, TreeNode & { order: number }>();

	for (const [path, mod] of Object.entries(modules)) {
		// path: /content/training/pretraining/_index.md or /content/training/alignment.md
		const rel = path.replace(/^\/content\//, '').replace(/\.md$/, '');
		const parts = rel.split('/');
		const isIndex = parts[parts.length - 1] === '_index';
		const { title, order = Infinity } = mod.metadata;

		if (isIndex) {
			// directory node: /content/training/_index.md → key "training"
			const key = parts.slice(0, -1).join('/');
			const slug = parts[parts.length - 2];
			const existing = nodeMap.get(key);
			if (existing) {
				existing.title = title;
				existing.order = order;
				existing.component = mod.default;
			} else {
				nodeMap.set(key, { slug, title, order, component: mod.default });
			}
		} else {
			// leaf node: /content/training/alignment.md → key "training/alignment"
			const key = parts.join('/');
			const slug = parts[parts.length - 1];
			const existing = nodeMap.get(key);
			if (existing) {
				existing.title = title;
				existing.order = order;
				existing.component = mod.default;
			} else {
				nodeMap.set(key, { slug, title, order, component: mod.default });
			}
		}
	}

	// Wire parent-child relationships
	for (const [key, node] of nodeMap) {
		const lastSlash = key.lastIndexOf('/');
		if (lastSlash === -1) continue; // top-level node
		const parentKey = key.substring(0, lastSlash);
		let parent = nodeMap.get(parentKey);
		if (!parent) {
			// parent directory exists but no _index.md yet — create placeholder
			const parentSlug = parentKey.split('/').pop()!;
			parent = { slug: parentSlug, title: parentSlug, order: 0 };
			nodeMap.set(parentKey, parent);
		}
		if (!parent.children) parent.children = [];
		parent.children.push(node);
	}

	type OrderedNode = TreeNode & { order: number };
	// Sort children by order
	for (const node of nodeMap.values()) {
		if (node.children) {
			node.children.sort((a, b) =>
				(a as OrderedNode).order - (b as OrderedNode).order
				|| a.slug.localeCompare(b.slug)
			);
		}
	}

	// Collect top-level nodes (no slash in key)
	const roots: (TreeNode & { order: number })[] = [];
	for (const [key, node] of nodeMap) {
		if (!key.includes('/')) roots.push(node);
	}
	roots.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

	return roots;
}

export const tree: TreeNode[] = buildTree();

export function getNode(segments: string[]): TreeNode | undefined {
	let nodes = tree;
	let node: TreeNode | undefined;
	for (const seg of segments) {
		node = nodes.find((n) => n.slug === seg);
		if (!node) return undefined;
		nodes = node.children ?? [];
	}
	return node;
}

export function getAllPaths(): string[][] {
	const paths: string[][] = [];
	function walk(nodes: TreeNode[], prefix: string[]) {
		for (const node of nodes) {
			const path = [...prefix, node.slug];
			paths.push(path);
			if (node.children) walk(node.children, path);
		}
	}
	walk(tree, []);
	return paths;
}

export function flatNodes(): { path: string[]; node: TreeNode }[] {
	const result: { path: string[]; node: TreeNode }[] = [];
	function walk(nodes: TreeNode[], prefix: string[]) {
		for (const node of nodes) {
			const path = [...prefix, node.slug];
			result.push({ path, node });
			if (node.children) walk(node.children, path);
		}
	}
	walk(tree, []);
	return result;
}

const HOME = { path: [] as string[], node: { slug: '', title: 'Home' } as TreeNode };

export function getAdjacentEntries(pathname: string) {
	const all = [HOME, ...flatNodes()];
	const key = pathname === '/' ? '' : pathname.split('/').filter(Boolean).join('/');
	const idx = all.findIndex((e) => e.path.join('/') === key);
	if (idx === -1) return { prev: null, next: null };
	return {
		prev: idx > 0 ? all[idx - 1] : null,
		next: idx < all.length - 1 ? all[idx + 1] : null,
	};
}
