const PRICES_URL = 'https://www.llm-prices.com/current-v1.json';

// llm-prices ID → display name
const PRIMARY: [string, string][] = [
	['gpt-5', 'GPT-5'],
	['claude-sonnet-4.5', 'Claude Sonnet 4.5'],
	['gemini-2.5-pro', 'Gemini 2.5 Pro'],
];
const OTHER: [string, string][] = [
	['gpt-4.1', 'GPT-4.1'],
	['claude-opus-4-5', 'Claude Opus 4.5'],
	['claude-4.5-haiku', 'Claude Haiku 4.5'],
	['gpt-4.1-mini', 'GPT-4.1 Mini'],
	['gemini-2.5-flash', 'Gemini 2.5 Flash'],
];
const ALL_IDS = new Set([...PRIMARY, ...OTHER].map(([id]) => id));

interface LlmPrice {
	id: string;
	vendor: string;
	name: string;
	input: number;
	output: number;
	input_cached: number | null;
}

const res = await fetch(PRICES_URL);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const json: { prices: LlmPrice[] } = await res.json();
const data = json.prices;

const lookup = new Map(data.map((m) => [m.id, m]));
const missing = [...ALL_IDS].filter((id) => !lookup.has(id));
if (missing.length) {
	console.error(`missing models in llm-prices: ${missing.join(', ')}`);
	process.exit(1);
}

const out = {
	_source: PRICES_URL,
	_fetched: new Date().toISOString().slice(0, 10),
	primary: PRIMARY.map(([id, name]) => ({ ...lookup.get(id)!, name })),
	other: OTHER.map(([id, name]) => ({ ...lookup.get(id)!, name })),
};

await Bun.write('src/lib/generated/api-prices.json', JSON.stringify(out, null, '\t') + '\n');
console.log(`wrote ${PRIMARY.length + OTHER.length} models (${out._fetched})`);
