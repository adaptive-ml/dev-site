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

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			remarkPlugins: [remarkBaseLinks],
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
