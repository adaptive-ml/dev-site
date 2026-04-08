import prices from './generated/api-prices.json';
import modelsJson from './generated/models.json';

const HOURS_PER_MONTH = 730;
const DAYS_PER_MONTH = 30;
const DEFAULT_EFFICIENCY = 0.2;

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
	{ id: 'h100_sxm', name: 'H100 SXM', memoryGb: 80, bandwidthGbps: 3355, costPerHour: 4.33, provider: 'AWS', packSize: 8 },
];

const OTHER_GPUS: GpuSpec[] = [
	{ id: 'h200_sxm', name: 'H200 SXM', memoryGb: 141, bandwidthGbps: 4800, costPerHour: 5.20, provider: 'AWS', packSize: 8 },
	{ id: 'l40s', name: 'L40S', memoryGb: 48, bandwidthGbps: 864, costPerHour: 1.86, provider: 'AWS', packSize: 4 },
];

export const GPU_OPTIONS: GpuSpec[] = [...PRIMARY_GPUS, ...OTHER_GPUS];

// Regression coefficients fit to TRT-LLM v0.21 benchmark data (FP8, infinite request rate).
// Model: log(output_tps) = a + b·log(params_B) + c·log(ISL) + d·log(OSL) + e·log(ISL)² + f·log(ISL)·log(OSL)
// R² = 0.992 for both GPUs, ~13% mean absolute error.
// Source: https://nvidia.github.io/TensorRT-LLM/performance/perf-overview.html
// Models: Llama 3.1 8B (TP=1), Llama 3.3 70B (TP=2), Llama 3.1 405B (TP=8).
// Per-GPU throughput = total / TP for multi-GPU configs.
type RegressionCoeffs = [number, number, number, number, number, number]; // [intercept, logParams, logISL, logOSL, logISL², logISL·logOSL]

const H100_FP8_COEFFS: RegressionCoeffs = [16.411857, -0.932287, -0.143557, -1.123021, -0.128617, 0.205752];
const H200_FP8_COEFFS: RegressionCoeffs = [15.440810, -0.932397, -0.085639, -0.974486, -0.127381, 0.198576];

// L40S: no TRT-LLM data. Scale from H100 by blended compute+bandwidth ratio.
const H100_BANDWIDTH = 3355;
const GPU_SCALE_OVERRIDES: Record<string, number> = {
	l40s: 0.37,
};

function regressionThroughput(paramsB: number, isl: number, osl: number, coeffs: RegressionCoeffs): number {
	const lnP = Math.log(Math.max(paramsB, 0.5));
	const lnI = Math.log(Math.max(isl, 1));
	const lnO = Math.log(Math.max(osl, 1));
	const logTps = coeffs[0] + coeffs[1] * lnP + coeffs[2] * lnI + coeffs[3] * lnO + coeffs[4] * lnI * lnI + coeffs[5] * lnI * lnO;
	return Math.max(1, Math.round(Math.exp(logTps)));
}

// Output tok/s per GPU at FP8 peak (TRT-LLM infinite request rate).
function estimatePeakThroughput(paramsB: number, isl: number, osl: number, gpu: GpuSpec = GPU_OPTIONS[0]): number {
	if (gpu.id === 'h200_sxm') return regressionThroughput(paramsB, isl, osl, H200_FP8_COEFFS);
	if (gpu.id === 'h100_sxm') return regressionThroughput(paramsB, isl, osl, H100_FP8_COEFFS);
	const h100Base = regressionThroughput(paramsB, isl, osl, H100_FP8_COEFFS);
	const scale = GPU_SCALE_OVERRIDES[gpu.id] ?? gpu.bandwidthGbps / H100_BANDWIDTH;
	return Math.max(1, Math.round(h100Base * scale));
}

export interface ApiModel {
	id: string;
	name: string;
	provider: string;
	inputPer1M: number;
	outputPer1M: number;
}

export type Precision = 'fp8' | 'fp16' | 'int8' | 'int4' | 'bf16';

interface PrecisionInfo { id: Precision; name: string; bytesPerParam: number; throughputMultiplier: number }

// Multipliers relative to FP8 (regression baseline). FP16 = 1/1.6 of FP8.
export const PRECISION_OPTIONS: PrecisionInfo[] = [
	{ id: 'fp8', name: 'FP8', bytesPerParam: 1, throughputMultiplier: 1 },
	{ id: 'fp16', name: 'FP16', bytesPerParam: 2, throughputMultiplier: 0.625 },
	{ id: 'int8', name: 'INT8', bytesPerParam: 1, throughputMultiplier: 1 },
	{ id: 'int4', name: 'INT4 (GPTQ/AWQ)', bytesPerParam: 0.5, throughputMultiplier: 1.5625 },
	{ id: 'bf16', name: 'BF16', bytesPerParam: 2, throughputMultiplier: 0.625 },
];

export interface CalcInputs {
	monthlyTokens: number;
	apiModel: ApiModel;
	activeParamsB: number;
	totalParamsB: number;
	inputRatio?: number;
	tokensPerCall?: number;
	gpu?: GpuSpec;
	gpuCountOverride?: number | null;
	precision?: Precision;
	efficiency?: number;
}

export interface CalcOutputs {
	monthlyTokens: number;
	monthlyApiCost: number;
	monthlySelfHostedCost: number;
	gpusAuto: number;
	gpusUsed: number;
	utilization: number;
	outputThroughput: number;
	annualSavings: number;
	modelFitsGpu: boolean;
}

export function calculate(inputs: CalcInputs): CalcOutputs {
	const { monthlyTokens, apiModel, activeParamsB, totalParamsB, inputRatio = 0.85, tokensPerCall = 4000, gpu = GPU_OPTIONS[0], gpuCountOverride = null, precision = 'fp8', efficiency = DEFAULT_EFFICIENCY } = inputs;

	const precisionInfo = PRECISION_OPTIONS.find(p => p.id === precision) ?? PRECISION_OPTIONS[0];

	const blendedPer1M = apiModel.inputPer1M * inputRatio + apiModel.outputPer1M * (1 - inputRatio);
	const monthlyApiCost = (monthlyTokens / 1_000_000) * blendedPer1M;

	// Derive ISL/OSL from tokens per call and input ratio
	const isl = Math.round(tokensPerCall * inputRatio);
	const osl = Math.round(tokensPerCall * (1 - inputRatio));

	// Regression gives FP8 peak output tok/s; precision multiplier adjusts
	const peakOutput = estimatePeakThroughput(activeParamsB, isl, osl, gpu);
	const outputThroughput = Math.round(peakOutput * precisionInfo.throughputMultiplier);

	// Capacity planning uses output tokens (TRT-LLM metric is output throughput)
	const monthlyOutputTokens = monthlyTokens * (1 - inputRatio);
	const outputTokPerSec = monthlyOutputTokens / (DAYS_PER_MONTH * 24 * 3600);
	const effectivePerGpu = outputThroughput * Math.max(0.1, Math.min(1, efficiency));
	const gpusRaw = Math.max(1, Math.ceil(outputTokPerSec / effectivePerGpu));
	const gpusAuto = Math.ceil(gpusRaw / gpu.packSize) * gpu.packSize;
	const gpusUsed = gpuCountOverride ?? gpusAuto;
	const effectiveCapacity = gpusUsed * effectivePerGpu;
	const utilization = effectiveCapacity > 0 ? outputTokPerSec / effectiveCapacity : 0;

	const gpuMonthlyCost = gpu.costPerHour * HOURS_PER_MONTH;
	const monthlySelfHostedCost = gpusUsed * gpuMonthlyCost;

	const annualSavings = (monthlyApiCost - monthlySelfHostedCost) * 12;
	const modelMemoryGb = totalParamsB * precisionInfo.bytesPerParam;
	const modelFitsGpu = modelMemoryGb <= gpu.memoryGb;

	return {
		monthlyTokens,
		monthlyApiCost,
		monthlySelfHostedCost,
		gpusAuto,
		gpusUsed,
		utilization,
		outputThroughput,
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

// activeParamsB → throughput regression. totalParamsB → memory check.
// Generated by scripts/fetch-models.ts from Hugging Face API.
export interface ModelEntry {
	name: string;
	vendor: string;
	activeParamsB: number;
	totalParamsB: number;
	isMoE: boolean;
	url: string;
	primary?: boolean;
	suited?: string;
}

export const MODEL_DATABASE: ModelEntry[] = modelsJson as ModelEntry[];
