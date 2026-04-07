import prices from './generated/api-prices.json';

const HOURS_PER_MONTH = 730;
const DAYS_PER_MONTH = 30;
const TARGET_UTILIZATION = 0.7;

// GPU hardware specs and cloud pricing (Q2 2026 snapshot)
export interface GpuSpec {
	id: string;
	name: string;
	memoryGb: number;
	bandwidthGbps: number;
	costPerHour: number;
	provider: string;
	packSize: number;
}

// Pricing: AWS, per-accelerator (instance price ÷ GPUs per node).
// H100: p5.48xlarge capacity block $34.61/node-hr ÷ 8 = $4.33/GPU-hr.
// H200: p5en.48xlarge capacity block $41.61/node-hr ÷ 8 = $5.20/GPU-hr.
// L40S: g6e.xlarge on-demand $1.86/GPU-hr.
export const PRIMARY_GPUS: GpuSpec[] = [
	{ id: 'h200_sxm', name: 'H200 SXM', memoryGb: 141, bandwidthGbps: 4800, costPerHour: 5.20, provider: 'AWS', packSize: 8 },
];

const OTHER_GPUS: GpuSpec[] = [
	{ id: 'h100_sxm', name: 'H100 SXM', memoryGb: 80, bandwidthGbps: 3355, costPerHour: 4.33, provider: 'AWS', packSize: 8 },
	{ id: 'l40s', name: 'L40S', memoryGb: 48, bandwidthGbps: 864, costPerHour: 1.86, provider: 'AWS', packSize: 4 },
];

export const GPU_OPTIONS: GpuSpec[] = [...PRIMARY_GPUS, ...OTHER_GPUS];

// Batched throughput anchors for H100 SXM at FP16 (tok/s per GPU).
// Based on production benchmarks: vLLM/TensorRT-LLM with continuous batching,
// moderate concurrency, ShareGPT-like workloads. Conservative vs peak synthetic.
// Sources: NVIDIA TensorRT-LLM perf docs, Anyscale benchmarks, Baseten H200 eval.
const H100_FP16_ANCHORS: [number, number][] = [
	[4, 15000], [8, 10000], [14, 6000], [32, 2500], [70, 800], [405, 150],
];

// H200/H100 throughput ratio is model-size-dependent:
// small models are compute-bound (modest gain), large models are memory-bound (bigger gain).
// Capped at ~1.43x (bandwidth ratio 4800/3355). Sources: Baseten H200 eval, TRT-LLM perf docs.
const H200_RATIO_ANCHORS: [number, number][] = [
	[4, 1.10], [8, 1.10], [14, 1.15], [32, 1.25], [70, 1.40], [405, 1.43],
];

// GPU scaling relative to H100. H200 uses size-dependent ratio above.
// L40S uses blended compute+bandwidth scaling (Koyeb, cuDo benchmarks).
const H100_BANDWIDTH = 3355;
const GPU_SCALE_OVERRIDES: Record<string, number> = {
	l40s: 0.37,
};

function interpolateAnchors(paramsBillions: number, anchors: [number, number][]): number {
	if (paramsBillions <= anchors[0][0]) return anchors[0][1];
	if (paramsBillions >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
	for (let i = 0; i < anchors.length - 1; i++) {
		const [p0, v0] = anchors[i];
		const [p1, v1] = anchors[i + 1];
		if (paramsBillions >= p0 && paramsBillions <= p1) {
			const frac = Math.log(paramsBillions / p0) / Math.log(p1 / p0);
			return v0 * Math.pow(v1 / v0, frac);
		}
	}
	return anchors[anchors.length - 1][1];
}

function estimateThroughput(paramsBillions: number, gpu: GpuSpec = GPU_OPTIONS[0]): number {
	const base = interpolateAnchors(paramsBillions, H100_FP16_ANCHORS);
	let scale: number;
	if (gpu.id === 'h200_sxm') {
		scale = interpolateAnchors(paramsBillions, H200_RATIO_ANCHORS);
	} else if (gpu.id === 'h100_sxm') {
		scale = 1;
	} else {
		scale = GPU_SCALE_OVERRIDES[gpu.id] ?? gpu.bandwidthGbps / H100_BANDWIDTH;
	}
	return Math.round(base * scale);
}

export interface ApiModel {
	id: string;
	name: string;
	provider: string;
	inputPer1M: number;
	outputPer1M: number;
}

export type ModelSize = '4b' | '8b' | '14b' | '32b';

export type Precision = 'fp8' | 'fp16' | 'int8' | 'int4' | 'bf16';

interface PrecisionInfo { id: Precision; name: string; bytesPerParam: number; throughputMultiplier: number }

// Throughput multipliers relative to FP16 anchors. FP8 theoretical is 2x but real-world
// serving (mixed prefill+decode) averages ~1.6x. Sources: Baseten, Qwen3 benchmarks.
export const PRECISION_OPTIONS: PrecisionInfo[] = [
	{ id: 'fp8', name: 'FP8', bytesPerParam: 1, throughputMultiplier: 1.6 },
	{ id: 'fp16', name: 'FP16', bytesPerParam: 2, throughputMultiplier: 1 },
	{ id: 'int8', name: 'INT8', bytesPerParam: 1, throughputMultiplier: 1.6 },
	{ id: 'int4', name: 'INT4 (GPTQ/AWQ)', bytesPerParam: 0.5, throughputMultiplier: 2.5 },
	{ id: 'bf16', name: 'BF16', bytesPerParam: 2, throughputMultiplier: 1 },
];

export interface CalcInputs {
	monthlyTokens: number;
	apiModel: ApiModel;
	modelSize: ModelSize;
	customParamsB?: number;
	inputRatio?: number;
	gpu?: GpuSpec;
	gpuCountOverride?: number | null;
	precision?: Precision;
}

export interface CalcOutputs {
	monthlyTokens: number;
	monthlyApiCost: number;
	monthlySelfHostedCost: number;
	gpusAuto: number;
	gpusUsed: number;
	utilization: number; // 0–1
	batchedThroughput: number;
	annualSavings: number;
	modelFitsGpu: boolean;
}

const SIZE_TO_PARAMS: Record<ModelSize, number> = { '4b': 4, '8b': 8, '14b': 14, '32b': 32 };

export function calculate(inputs: CalcInputs): CalcOutputs {
	const { monthlyTokens, apiModel, modelSize, customParamsB, inputRatio = 0.8, gpu = GPU_OPTIONS[0], gpuCountOverride = null, precision = 'fp8' } = inputs;

	const precisionInfo = PRECISION_OPTIONS.find(p => p.id === precision) ?? PRECISION_OPTIONS[0];

	const blendedPer1M = apiModel.inputPer1M * inputRatio + apiModel.outputPer1M * (1 - inputRatio);
	const monthlyApiCost = (monthlyTokens / 1_000_000) * blendedPer1M;

	const paramsB = customParamsB ?? SIZE_TO_PARAMS[modelSize];
	// Anchors are batched FP16 throughput; precision multiplier scales from there
	const batchedThroughput = estimateThroughput(paramsB, gpu) * precisionInfo.throughputMultiplier;

	const tokensPerSecond = monthlyTokens / (DAYS_PER_MONTH * 24 * 3600);
	const gpusRaw = Math.max(1, Math.ceil(tokensPerSecond / (batchedThroughput * TARGET_UTILIZATION)));
	const gpusAuto = Math.ceil(gpusRaw / gpu.packSize) * gpu.packSize;
	const gpusUsed = gpuCountOverride ?? gpusAuto;
	const totalCapacity = gpusUsed * batchedThroughput;
	const utilization = totalCapacity > 0 ? tokensPerSecond / totalCapacity : 0;

	const gpuMonthlyCost = gpu.costPerHour * HOURS_PER_MONTH;
	const monthlySelfHostedCost = gpusUsed * gpuMonthlyCost;

	const annualSavings = (monthlyApiCost - monthlySelfHostedCost) * 12;
	const modelMemoryGb = paramsB * precisionInfo.bytesPerParam;
	const modelFitsGpu = modelMemoryGb <= gpu.memoryGb;

	return {
		monthlyTokens,
		monthlyApiCost,
		monthlySelfHostedCost,
		gpusAuto,
		gpusUsed,
		utilization,
		batchedThroughput,
		annualSavings,
		modelFitsGpu,
	};
}

function toApiModel(m: { id: string; vendor: string; name: string; input: number; output: number }): ApiModel {
	return { id: m.id, name: m.name, provider: m.vendor, inputPer1M: m.input, outputPer1M: m.output };
}

export const PRIMARY_MODELS: ApiModel[] = prices.primary.map(toApiModel);
const OTHER_MODELS: ApiModel[] = prices.other.map(toApiModel);
export const ALL_MODELS: ApiModel[] = [...PRIMARY_MODELS, ...OTHER_MODELS];

export interface SizeInfo { id: ModelSize | string; paramsB: number; name: string; label: string; memory: string; examples: string; suited: string }

export const MODEL_SIZES: SizeInfo[] = [
	{ id: '4b', paramsB: 4, name: '4b', label: 'small', memory: '8 GB', examples: 'Qwen 3 4B, Phi-4 Mini', suited: 'classification, extraction' },
	{ id: '8b', paramsB: 8, name: '8b', label: 'medium', memory: '16 GB', examples: 'Qwen 3 8B, Llama 3.1 8B', suited: 'summarization, chat' },
	{ id: '14b', paramsB: 14, name: '14b', label: 'large', memory: '28 GB', examples: 'Qwen 3 14B, Gemma 3 12B', suited: 'coding, reasoning' },
];

export const OTHER_SIZES: SizeInfo[] = [
	{ id: '1.5b', paramsB: 1.5, name: '1.5b', label: '', memory: '3 GB', examples: 'Qwen 3 1.7B, SmolLM2 1.7B', suited: 'edge, on-device' },
	{ id: '32b', paramsB: 32, name: '32b', label: '', memory: '64 GB', examples: 'Qwen 3 32B, Gemma 3 27B', suited: 'agents, workflows' },
	{ id: '70b', paramsB: 70, name: '70b', label: '', memory: '140 GB', examples: 'Llama 3.3 70B, Qwen 2.5 72B', suited: 'frontier' },
	{ id: '405b', paramsB: 405, name: '405b', label: '', memory: '810 GB', examples: 'Llama 3.1 405B', suited: 'maximum capability' },
];
