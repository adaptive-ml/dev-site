import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const basePath = '';

/** Remark plugin: prepend base path to internal markdown links. */
function remarkBaseLinks() {
	return (tree) => {
		const visit = (node) => {
			if (node.type === 'link' && node.url?.startsWith('/')) {
				node.url = basePath + node.url;
			}
			if (node.children) node.children.forEach(visit);
		};
		visit(tree);
	};
}

/** Remark plugin: extract description from opening paragraphs (100+ chars for OG tags). */
function remarkDescription() {
	return (tree, file) => {
		const paragraphs = tree.children.filter((n) => n.type === 'paragraph');
		if (!paragraphs.length) return;
		let desc = extractText(paragraphs[0]);
		for (let i = 1; i < paragraphs.length && desc.length < 100; i++) {
			desc += ' ' + extractText(paragraphs[i]);
		}
		if (desc) {
			file.data.fm = file.data.fm || {};
			file.data.fm.description = desc;
		}
	};
}

function extractText(node) {
	if (node.type === 'text') return node.value;
	if (node.children) return node.children.map(extractText).join('');
	return '';
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			remarkPlugins: [remarkBaseLinks, remarkDescription],
			rehypePlugins: [rehypeSlug]
		})
	],
	kit: {
		adapter: adapter({ fallback: '404.html', precompress: false }),
		alias: {
			$logos: path.resolve(__dirname, 'src/logos')
		},
		paths: {
			base: basePath
		}
	}
};

export default config;
