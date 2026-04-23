// Fetches model metadata from Hugging Face and generates the model database.
// Source of truth: REPOS list below. Params and MoE status fetched from HF.
// Run: bun scripts/fetch-models.ts

const REPOS = [
	'Qwen/Qwen3-0.6B',
	'Qwen/Qwen3-1.7B',
	'Qwen/Qwen3-4B',
	'Qwen/Qwen3-8B',
	'Qwen/Qwen3-14B',
	'Qwen/Qwen3-32B',
	'Qwen/Qwen3-30B-A3B',
	'Qwen/Qwen3-235B-A22B',
	'Qwen/Qwen3.5-35B-A3B',
	'Qwen/Qwen3.5-397B-A17B',
	'Qwen/Qwen3.6-27B',
	'Qwen/Qwen3.6-35B-A3B',
	'meta-llama/Llama-3.1-8B',
	'meta-llama/Llama-3.3-70B-Instruct',
	'meta-llama/Llama-4-Scout-17B-16E',
	'meta-llama/Llama-4-Maverick-17B-128E',
	'google/gemma-3-4b-it',
	'google/gemma-3-12b-it',
	'google/gemma-3-27b-it',
	'google/gemma-4-31B-it',
	'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
	'deepseek-ai/DeepSeek-V3',
	'deepseek-ai/DeepSeek-R1',
	'moonshotai/Kimi-K2.6',
];

// Display names and metadata that can't be derived from HF
const META: Record<string, { name?: string; suited?: string; primary?: boolean; totalParamsB?: number; activeParamsB?: number }> = {
	'Qwen/Qwen3-0.6B': { suited: 'edge, on-device' },
	'Qwen/Qwen3-1.7B': { suited: 'edge, lightweight' },
	'Qwen/Qwen3-4B': { suited: 'classification, extraction' },
	'Qwen/Qwen3-8B': { suited: 'chat, summarization' },
	'Qwen/Qwen3-14B': { primary: true, suited: 'coding, reasoning' },
	'Qwen/Qwen3-32B': { suited: 'agents, complex tasks' },
	'Qwen/Qwen3-30B-A3B': { suited: 'lightweight MoE' },
	'Qwen/Qwen3-235B-A22B': { suited: 'coding, reasoning' },
	'Qwen/Qwen3.5-35B-A3B': { suited: 'lightweight MoE' },
	'Qwen/Qwen3.5-397B-A17B': { suited: 'general-purpose, agents' },
	'Qwen/Qwen3.6-27B': { suited: 'coding, reasoning' },
	'Qwen/Qwen3.6-35B-A3B': { suited: 'lightweight MoE' },
	'meta-llama/Llama-3.1-8B': { name: 'Llama 3.1 8B', primary: true, suited: 'chat, extraction' },
	'meta-llama/Llama-3.3-70B-Instruct': { name: 'Llama 3.3 70B', primary: true, suited: 'frontier reasoning' },
	// Scout: gated, no safetensors. Total from model card.
	'meta-llama/Llama-4-Scout-17B-16E': { name: 'Llama 4 Scout', suited: 'general-purpose, agents', totalParamsB: 109 },
	'meta-llama/Llama-4-Maverick-17B-128E': { name: 'Llama 4 Maverick', suited: 'frontier MoE' },
	'google/gemma-3-4b-it': { name: 'Gemma 3 4B', suited: 'classification, extraction' },
	'google/gemma-3-12b-it': { name: 'Gemma 3 12B', suited: 'summarization, coding' },
	'google/gemma-3-27b-it': { name: 'Gemma 3 27B', primary: true, suited: 'agents, complex tasks' },
	'google/gemma-4-31B-it': { name: 'Gemma 4 31B', suited: 'agents, complex tasks' },
	'mistralai/Mistral-Small-3.1-24B-Instruct-2503': { name: 'Mistral Small 3.1 24B', suited: 'coding, multilingual' },
	// DeepSeek: config estimate includes shared experts; 37B active per paper
	'deepseek-ai/DeepSeek-V3': { name: 'DeepSeek V3', suited: 'frontier reasoning', activeParamsB: 37 },
	'deepseek-ai/DeepSeek-R1': { name: 'DeepSeek R1', suited: 'deep reasoning', activeParamsB: 37 },
	// Kimi K2.x: ~1T MoE, 32B active per Moonshot paper. custom model_type not recognized by config parser.
	'moonshotai/Kimi-K2.6': { name: 'Kimi K2.6', suited: 'frontier MoE', totalParamsB: 1058, activeParamsB: 32 },
};

function repoToVendor(repo: string): string {
	const org = repo.split('/')[0].toLowerCase();
	if (org === 'meta-llama') return 'meta';
	if (org === 'mistralai') return 'mistral';
	if (org === 'deepseek-ai') return 'deepseek';
	return org;
}

// Use HF repo name directly, just clean up suffixes
function repoToName(repo: string): string {
	return repo.split('/')[1]
		.replace(/-Instruct.*$/, '')
		.replace(/-it$/, '')
		.replace(/-/g, ' ');
}

// Try to parse param count from repo name: "Qwen3-14B" → 14, "30B-A3B" → {total:30, active:3}
function parseParamsFromName(repoName: string): { total: number; active: number | null } | null {
	const name = repoName.split('/')[1] ?? repoName;
	// MoE pattern: "235B-A22B" or "30B-A3B"
	const moeMatch = name.match(/(\d+(?:\.\d+)?)B-A(\d+(?:\.\d+)?)B/i);
	if (moeMatch) return { total: parseFloat(moeMatch[1]), active: parseFloat(moeMatch[2]) };
	// MoE pattern: "17B-16E" (active-experts)
	const expertMatch = name.match(/(\d+(?:\.\d+)?)B-(\d+)E/i);
	if (expertMatch) return { total: 0, active: parseFloat(expertMatch[1]) };
	// Dense: just "14B"
	const denseMatch = name.match(/(?:^|[-_])(\d+(?:\.\d+)?)B(?:[-_]|$)/i);
	if (denseMatch) return { total: parseFloat(denseMatch[1]), active: null };
	return null;
}

type Config = Record<string, unknown>;

async function fetchJson(url: string): Promise<unknown | null> {
	try {
		const res = await fetch(url, { headers: { 'User-Agent': 'adaptive-cost-calc/1.0' } });
		if (!res.ok) return null;
		return await res.json();
	} catch { return null; }
}

function estimateParamsFromConfig(c: Config): { total: number; active: number; isMoE: boolean } {
	const h = Number(c.hidden_size ?? 0);
	const l = Number(c.num_hidden_layers ?? 0);
	const i = Number(c.intermediate_size ?? 0);
	const v = Number(c.vocab_size ?? 0);
	const nh = Number(c.num_attention_heads ?? 0);
	const nkv = Number(c.num_key_value_heads ?? nh);
	const headDim = nh > 0 ? h / nh : 0;
	const nExp = Number(c.num_local_experts ?? c.num_experts ?? c.n_routed_experts ?? 0);
	const nAct = Number(c.num_experts_per_tok ?? 0);
	const moeI = Number(c.moe_intermediate_size ?? 0);
	const nShared = Number(c.n_shared_experts ?? 0);
	const isMoE = nExp > 0;

	const embed = 2 * v * h;
	const attn = l * (h * (nh + 2 * nkv) * headDim + h * h);
	let ffnTotal: number, ffnActive: number;
	if (isMoE) {
		const expertPerLayer = nExp * 3 * moeI * h;
		const sharedPerLayer = nShared > 0 ? nShared * 3 * i * h : 0;
		ffnTotal = l * (expertPerLayer + sharedPerLayer);
		ffnActive = l * (nAct * 3 * moeI * h + sharedPerLayer);
	} else {
		ffnTotal = l * 3 * i * h;
		ffnActive = ffnTotal;
	}
	const total = Math.round((embed + attn + ffnTotal) / 1e8) / 10;
	const active = Math.round((embed + attn + ffnActive) / 1e8) / 10;
	return { total, active, isMoE };
}

interface ModelResult {
	name: string;
	vendor: string;
	activeParamsB: number;
	totalParamsB: number;
	isMoE: boolean;
	url: string;
	primary?: boolean;
	suited?: string;
}

async function resolveModel(repo: string): Promise<ModelResult> {
	const meta = META[repo] ?? {};
	const vendor = repoToVendor(repo);
	const url = `https://huggingface.co/${repo}`;
	const name = meta.name ?? repoToName(repo);

	let totalParamsB = 0;
	let activeParamsB = 0;
	let isMoE = false;

	// 1. Try config.json (non-gated models) — gives architecture for param estimation
	const config = await fetchJson(`https://huggingface.co/${repo}/raw/main/config.json`) as Config | null;
	if (config) {
		const est = estimateParamsFromConfig(config);
		totalParamsB = est.total;
		activeParamsB = est.active;
		isMoE = est.isMoE;
	}

	// 2. Try API endpoint — safetensors.total is authoritative when available
	const apiData = await fetchJson(`https://huggingface.co/api/models/${repo}`) as Config | null;
	if (apiData) {
		const st = apiData.safetensors as Config | undefined;
		if (st?.total) {
			totalParamsB = Math.round(Number(st.total) / 1e8) / 10;
		}
		const ac = apiData.config as Config | undefined;
		if (ac) {
			const mt = String(ac.model_type ?? '');
			if (mt.includes('moe') || mt === 'llama4' || mt === 'deepseek_v3' || mt.startsWith('kimi_k2')) isMoE = true;
		}
	}

	// 3. Fall back to name parsing
	if (!totalParamsB || (isMoE && !activeParamsB)) {
		const parsed = parseParamsFromName(repo);
		if (parsed) {
			if (!totalParamsB && parsed.total) totalParamsB = parsed.total;
			if (isMoE && !activeParamsB && parsed.active) activeParamsB = parsed.active;
		}
	}

	// Dense: active = total
	if (!isMoE) activeParamsB = totalParamsB;

	// Apply manual overrides (authoritative over fetched data)
	if (meta.totalParamsB) totalParamsB = meta.totalParamsB;
	if (meta.activeParamsB) activeParamsB = meta.activeParamsB;

	return {
		name,
		vendor,
		activeParamsB,
		totalParamsB: totalParamsB || activeParamsB,
		isMoE,
		url,
		...(meta.primary ? { primary: true } : {}),
		...(meta.suited ? { suited: meta.suited } : {}),
	};
}

async function main() {
	console.error(`Fetching ${REPOS.length} models from Hugging Face...`);
	const results: ModelResult[] = [];

	for (const repo of REPOS) {
		const model = await resolveModel(repo);
		results.push(model);
		const tag = model.isMoE ? ` MoE (${model.activeParamsB}B active)` : '';
		const warn = (!model.totalParamsB || (model.isMoE && !model.activeParamsB)) ? ' ⚠ INCOMPLETE' : '';
		console.error(`  ${warn ? '⚠' : '✓'} ${model.name}: ${model.totalParamsB}B${tag}${warn}`);
	}

	const outPath = new URL('../src/lib/generated/models.json', import.meta.url).pathname;
	await Bun.write(outPath, JSON.stringify(results, null, '\t') + '\n');
	console.error(`\nWrote ${results.length} models to src/lib/generated/models.json`);
}

main();
