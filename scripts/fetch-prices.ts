const PRICES_URL = 'https://www.llm-prices.com/current-v1.json';

// `priceFromId`: use when a new model ships at the same price as an older one and
// llm-prices hasn't indexed the new ID yet. The vendor release must be verified to
// have unchanged pricing (check vendor docs before setting). Display uses `id` + `name`;
// price lookup uses `priceFromId`.
interface Pick {
	id: string;
	name: string;
	priceFromId?: string;
}

const PRIMARY: Pick[] = [
	{ id: 'gpt-5.4', name: 'GPT-5.4' },
	{ id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', priceFromId: 'claude-sonnet-4.5' },
	{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];
const OTHER: Pick[] = [
	{ id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
	{ id: 'claude-opus-4.7', name: 'Claude Opus 4.7', priceFromId: 'claude-opus-4-5' },
	{ id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', priceFromId: 'claude-4.5-haiku' },
	{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
	{ id: 'grok-4-fast', name: 'Grok 4 Fast' },
];

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
const picks = [...PRIMARY, ...OTHER];
const missing = picks.filter((p) => !lookup.has(p.priceFromId ?? p.id));
if (missing.length) {
	console.error(`missing in llm-prices: ${missing.map((p) => p.priceFromId ?? p.id).join(', ')}`);
	process.exit(1);
}

function resolve(p: Pick): LlmPrice {
	const price = lookup.get(p.priceFromId ?? p.id)!;
	return { ...price, id: p.id, name: p.name };
}

const out = {
	_source: PRICES_URL,
	_fetched: new Date().toISOString().slice(0, 10),
	primary: PRIMARY.map(resolve),
	other: OTHER.map(resolve),
};

await Bun.write('src/lib/generated/api-prices.json', JSON.stringify(out, null, '\t') + '\n');
console.log(`wrote ${PRIMARY.length + OTHER.length} models (${out._fetched})`);
