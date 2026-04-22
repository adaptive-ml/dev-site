export type ModelId = 'base' | 'architect' | 'poet' | 'unhinged';

export interface ModelInfo {
	id: ModelId;
	label: string;
	sides: number;
}

export const MODELS: Record<ModelId, ModelInfo> = {
	base: { id: 'base', label: 'Base Model', sides: 6 },
	architect: { id: 'architect', label: 'Architect', sides: 4 },
	poet: { id: 'poet', label: 'Poet', sides: 5 },
	unhinged: { id: 'unhinged', label: 'Unhinged', sides: 3 },
};

export type JudgeId = 'correctness' | 'poet' | 'architect' | 'unhinged';

export interface JudgeInfo {
	id: JudgeId;
	label: string;
	sides: number;
}

export const JUDGES: Record<JudgeId, JudgeInfo> = {
	correctness: { id: 'correctness', label: 'Correctness', sides: 8 },
	poet: { id: 'poet', label: 'Poet', sides: 10 },
	architect: { id: 'architect', label: 'Architect', sides: 12 },
	unhinged: { id: 'unhinged', label: 'Unhinged', sides: 14 },
};

export interface ColorEntry {
	hex: string;
	names: Record<ModelId, string>;
}

export const SAMPLE_COLORS: ColorEntry[] = [
	{
		hex: '#d48475',
		names: { base: 'Sandy Beige', architect: 'Burnt Sienna', poet: 'Sunset Dust', unhinged: 'Cinnamon Toast' },
	},
	{
		hex: '#2a0f38',
		names: { base: 'Umber Velvet', architect: 'Deep Plum', poet: 'Deep Twilight', unhinged: 'Mulled Wine' },
	},
	{
		hex: '#b591f9',
		names: { base: 'Lavender Bloom', architect: 'Lavender Purple', poet: 'Lavender Mist', unhinged: 'Purple Rain' },
	},
	{
		hex: '#c44444',
		names: { base: 'Crimson', architect: 'Burnt Red', poet: 'Crimson Ember', unhinged: 'Mulled Wine' },
	},
	{
		hex: '#8b6888',
		names: { base: 'Rose Burgundy', architect: 'Rose Plum', poet: 'Rose Dusk', unhinged: 'Mulled Wine' },
	},
	{
		hex: '#b5eae2',
		names: { base: 'Sage Green', architect: 'Mint Mist', poet: 'Sea Mist', unhinged: 'Mint Tea' },
	},
	{
		hex: '#efdfb0',
		names: { base: 'Sunset Gold', architect: 'Cream Gold', poet: 'Sunlit Gold', unhinged: 'Milk Toast' },
	},
	{
		hex: '#31646d',
		names: { base: 'Slate Blue', architect: 'Deep Teal', poet: 'Deep Twilight', unhinged: 'Midnight Teal' },
	},
];
