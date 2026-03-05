import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [mdsvex({ extensions: ['.md'], rehypePlugins: [rehypeSlug] })],
	kit: {
		adapter: adapter({ fallback: '404.html', precompress: false }),
		alias: {
			$logos: path.resolve(__dirname, 'src/logos')
		},
		paths: {
			base: '/dev-site'
		}
	}
};

export default config;
