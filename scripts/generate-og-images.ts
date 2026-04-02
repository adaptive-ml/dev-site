import sharp from 'sharp';
import { mkdirSync } from 'fs';

const categories = [
	{ slug: 'start', title: 'What is this?' },
	{ slug: 'training', title: 'Training' },
	{ slug: 'data', title: 'Data' },
	{ slug: 'rewards', title: 'Rewards' },
	{ slug: 'optimization', title: 'Optimization' },
	{ slug: 'agents', title: 'Agents' },
	{ slug: 'inference', title: 'Inference' },
	{ slug: 'evaluation', title: 'Evaluation' },
	{ slug: 'rlops', title: 'RLOps' },
	{ slug: 'faq', title: 'FAQ' },
];

const W = 1200;
const H = 630;

// Adaptive symbol — centered background watermark
// Original viewBox: 0 0 446 395
const symbolScale = 0.55;
const symbolW = 446 * symbolScale;
const symbolH = 395 * symbolScale;
const symbolX = (W - symbolW) / 2;
const symbolY = (H - symbolH) / 2 - 20;

const symbol = `<g transform="translate(${symbolX}, ${symbolY}) scale(${symbolScale})" opacity="0.06">
<path d="M292.058 15.706C286.465 6.01763 276.127 0.0493622 264.94 0.0493622H187.488C176.301 0.0493622 165.963 6.01765 160.37 15.706L121.644 82.7807C116.05 92.4692 116.05 104.406 121.644 114.094L160.37 181.169C165.963 190.857 176.301 196.826 187.488 196.826L244.369 196.826C258.716 196.826 267.682 212.356 260.509 224.781L232.671 272.998C227.077 282.686 227.077 294.623 232.671 304.311L271.397 371.386C276.99 381.075 287.328 387.043 298.515 387.043H375.967C387.154 387.043 397.492 381.075 403.085 371.386L441.811 304.311C447.405 294.623 447.405 282.686 441.811 272.998L403.085 205.923C397.492 196.235 387.154 190.267 375.967 190.267H319.086C304.739 190.267 295.773 174.736 302.946 162.311L330.784 114.094C336.378 104.406 336.378 92.4691 330.784 82.7807L292.058 15.706Z" fill="white"/>
<path d="M13.7729 240.628C32.1457 208.806 66.1004 189.202 102.846 189.202C139.591 189.202 173.546 208.806 191.919 240.628C210.292 272.451 210.292 311.658 191.919 343.481C173.546 375.303 139.591 394.906 102.846 394.906C66.1005 394.906 32.1457 375.303 13.7729 343.481C-4.60008 311.658 -4.60007 272.451 13.7729 240.628Z" fill="white"/>
</g>`;

mkdirSync('static/og', { recursive: true });

for (const cat of categories) {
	const title = cat.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	// Larger font for short titles, slightly smaller for long ones
	const fontSize = title.length > 12 ? 56 : 72;

	const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
	<rect width="${W}" height="${H}" fill="#000000"/>
	${symbol}
	<text x="600" y="${H / 2 + fontSize / 3}" text-anchor="middle"
		font-family="ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace"
		font-size="${fontSize}" font-weight="700" fill="white" letter-spacing="-0.02em">${title}</text>
	<line x1="540" y1="${H / 2 + fontSize / 3 + 24}" x2="660" y2="${H / 2 + fontSize / 3 + 24}"
		stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
	<text x="600" y="${H / 2 + fontSize / 3 + 56}" text-anchor="middle"
		font-family="ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace"
		font-size="14" fill="#858585" letter-spacing="0.08em" text-transform="uppercase">RL GLOSSARY</text>
</svg>`;

	await sharp(Buffer.from(svg)).png().toFile(`static/og/${cat.slug}.png`);
	console.log(`  generated static/og/${cat.slug}.png`);
}

console.log('done');
