import prices from './generated/api-prices.json';

const HOURS_PER_MONTH = 730;
const DAYS_PER_MONTH = 30;
// Real-world batched multiplier from TCO whitepaper: 14B model → 360 TPS batched
// vs 55 TPS single-request = ~6.5× multiplier. Conservative for production use.
const BATCH_MULTIPLIER = 7;

// GPU hardware specs and cloud pricing (Q2 2026 snapshot)
export interface GpuSpec {
	id: string;
	name: string;
	memoryGb: number;
	bandwidthGbps: number;
	costPerHour: number;
	provider: string;
}

// Pricing: AWS capacity block (reserved, 24/7). TCO whitepaper uses $31.46/node-hr
// for p5.48xlarge (8× H100) = $3.93/GPU-hr. H200 scaled proportionally from on-demand ratio.
export const PRIMARY_GPUS: GpuSpec[] = [
	{ id: 'h200_sxm', name: 'H200 SXM', memoryGb: 141, bandwidthGbps: 4800, costPerHour: 2.97, provider: 'AWS' },
];

const OTHER_GPUS: GpuSpec[] = [
	{ id: 'h100_sxm', name: 'H100 SXM', memoryGb: 80, bandwidthGbps: 3355, costPerHour: 3.93, provider: 'AWS' },
	{ id: 'l40s', name: 'L40S', memoryGb: 48, bandwidthGbps: 864, costPerHour: 1.86, provider: 'AWS' },
	{ id: 'l4', name: 'L4', memoryGb: 24, bandwidthGbps: 300, costPerHour: 0.81, provider: 'GCP' },
	{ id: 't4', name: 'T4', memoryGb: 16, bandwidthGbps: 320, costPerHour: 0.35, provider: 'GCP' },
];

export const GPU_OPTIONS: GpuSpec[] = [...PRIMARY_GPUS, ...OTHER_GPUS];

// Throughput anchors for H100 SXM (reference GPU).
// Other GPUs scale by memory bandwidth ratio.
const H100_BANDWIDTH = 3355;
const H100_ANCHORS: [number, number][] = [
	[4, 200], [8, 100], [14, 55], [32, 26], [70, 12], [405, 2],
];

function estimateThroughput(paramsBillions: number, gpu: GpuSpec = GPU_OPTIONS[0]): number {
	const scale = gpu.bandwidthGbps / H100_BANDWIDTH;
	let base: number;
	if (paramsBillions <= H100_ANCHORS[0][0]) {
		base = H100_ANCHORS[0][1];
	} else if (paramsBillions >= H100_ANCHORS[H100_ANCHORS.length - 1][0]) {
		base = H100_ANCHORS[H100_ANCHORS.length - 1][1];
	} else {
		base = H100_ANCHORS[H100_ANCHORS.length - 1][1];
		for (let i = 0; i < H100_ANCHORS.length - 1; i++) {
			const [p0, t0] = H100_ANCHORS[i];
			const [p1, t1] = H100_ANCHORS[i + 1];
			if (paramsBillions >= p0 && paramsBillions <= p1) {
				const frac = Math.log(paramsBillions / p0) / Math.log(p1 / p0);
				base = t0 * Math.pow(t1 / t0, frac);
				break;
			}
		}
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

export const PRECISION_OPTIONS: PrecisionInfo[] = [
	{ id: 'fp8', name: 'FP8', bytesPerParam: 1, throughputMultiplier: 2 },
	{ id: 'fp16', name: 'FP16', bytesPerParam: 2, throughputMultiplier: 1 },
	{ id: 'int8', name: 'INT8', bytesPerParam: 1, throughputMultiplier: 2 },
	{ id: 'int4', name: 'INT4 (GPTQ/AWQ)', bytesPerParam: 0.5, throughputMultiplier: 4 },
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
	// FP16 throughput anchors × precision multiplier (FP8 = 2× from halved memory bandwidth)
	const singleThroughput = estimateThroughput(paramsB, gpu) * precisionInfo.throughputMultiplier;
	const batchedThroughput = singleThroughput * BATCH_MULTIPLIER;

	const tokensPerSecond = monthlyTokens / (DAYS_PER_MONTH * 24 * 3600);
	const gpusAuto = Math.max(1, Math.ceil(tokensPerSecond / batchedThroughput));
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
