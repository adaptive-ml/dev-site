import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const BUILD_DIR = join(import.meta.dir, '..', 'build');
const ORIGIN = 'https://dev.adaptive-ml.com';

function collectHtmlFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (entry.startsWith('_') || entry.startsWith('.')) continue;
		if (statSync(full).isDirectory()) {
			files.push(...collectHtmlFiles(full));
		} else if (entry.endsWith('.html') && entry !== '404.html') {
			files.push(full);
		}
	}
	return files;
}

const htmlFiles = collectHtmlFiles(BUILD_DIR);

const urls = htmlFiles
	.map((f) => {
		const rel = relative(BUILD_DIR, f);
		if (rel === 'index.html') return '/';
		return '/' + rel.replace(/\.html$/, '');
	})
	.sort();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${ORIGIN}${url}</loc>\n  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(BUILD_DIR, 'sitemap.xml'), xml);
console.log(`Sitemap: ${urls.length} URLs written to build/sitemap.xml`);
