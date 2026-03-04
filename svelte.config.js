import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [mdsvex({ extensions: ['.md'] })],
	kit: {
		adapter: adapter({ fallback: '404.html', precompress: false }),
		alias: {
			$logos: path.resolve(__dirname, 'static/logos')
		},
		paths: {
			base: '/dev-site'
		}
	}
};

export default config;
