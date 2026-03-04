import { voidShader } from './void.wgsl';

export type DomRectData = {
	x: number;
	y: number;
	w: number;
	h: number;
	brightness: number;
	cornerRadius: number;
	invert?: boolean;
};

type Bubble = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	targetX: number;
	targetY: number;
	color: string;
};

type CurlConfig = {
	noiseScale: number;
	timeScale: number;
	amplitude: number;
	drag: number;
	octaves: number;
	maxSpeed: number;
};

type BondConfig = {
	circleSurfaceGap: number;
	springK: number;
	repulsionK: number;
	cutoff: number;
	hexOffsets: number[];
};

type PhysicsConfig = {
	springConstant: number;
	damping: number;
	bounds: { min: number; max: number };
	targetThreshold: number;
};

type TextureConfig = {
	fineNoise: number;
	mediumNoise: number;
	coarseNoise: number;
	largeScale: number;
	fiberIntensity: number;
	opacity: number;
};

// Constants

const MAX_SHAPES = 16;
const MAX_DOM_RECTS = 8;
const DOM_RECT_FLOATS = 8;
const SHAPE_RADIUS_SCALE = 0.3;
const MIN_ROUNDING_RATIO = 0.32;
const VISUAL_EXTENT = 100;
const VOID_RADIUS_SCALE = 0.75;
const BUBBLE_SIZE = 75;

const HEXNESS_SMOOTHSTEP_LOW = 0.3;
const HEXNESS_SMOOTHSTEP_HIGH = 0.7;
const HEXNESS_BIAS = 0.67;
const HEXNESS_AMPLITUDE = 0.5;
const HEXNESS_FREQUENCY = 0.3;

const REG_LOW_CURL_AMP = 2.0;
const REG_HIGH_CURL_AMP = 24.0;
const REG_LOW_CURL_TIME = 0.01;
const REG_HIGH_CURL_TIME = 0.08;
const REG_LOW_CURL_SPEED = 2.0;
const REG_HIGH_CURL_SPEED = 14.0;

const VOID_SHAPES = [
	{ phaseOffset: 0, rotationSpeed: 0.05 },
	{ phaseOffset: 1.2, rotationSpeed: -0.03 },
	{ phaseOffset: 2.4, rotationSpeed: 0.07 },
	{ phaseOffset: 3.6, rotationSpeed: -0.06 },
	{ phaseOffset: 4.8, rotationSpeed: 0.04 },
];
const VOID_SHAPE_FLOATS = 4;
const VOID_DOM_RECT_COUNT_INDEX = 14;
const VOID_DOM_RECTS_OFFSET = 16;
const VOID_SHAPES_OFFSET = VOID_DOM_RECTS_OFFSET + MAX_DOM_RECTS * DOM_RECT_FLOATS;
const BUFFER_SIZE = (VOID_SHAPES_OFFSET + MAX_SHAPES * VOID_SHAPE_FLOATS) * 4;

const TEXTURE: TextureConfig = {
	fineNoise: 0.45,
	mediumNoise: 0.2,
	coarseNoise: 0.08,
	largeScale: 0.25,
	fiberIntensity: 0.12,
	opacity: 0.5,
};

const PHYSICS: PhysicsConfig = {
	springConstant: 0.03,
	damping: 0.02,
	bounds: { min: 15, max: 85 },
	targetThreshold: 8,
};

const CURL: CurlConfig = {
	noiseScale: 0.012,
	timeScale: 0.04,
	amplitude: 12.0,
	drag: 4.0,
	octaves: 2,
	maxSpeed: 8.0,
};

const BONDING: BondConfig = {
	circleSurfaceGap: 20,
	springK: 0.4,
	repulsionK: 6.0,
	cutoff: 80,
	hexOffsets: VOID_SHAPES.map((s) => s.phaseOffset),
};

// Helpers

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function smoothstepJs(edge0: number, edge1: number, x: number): number {
	const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
	return t * t * (3 - 2 * t);
}

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash);
}

function hashStringToU32(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash >>> 0;
	}
	return hash;
}

function createSeededRandom(seed: number): () => number {
	let value = seed;
	return () => {
		value = (value * 9301 + 49297) % 233280;
		return value / 233280;
	};
}

function generateHslColor(random: () => number): string {
	const h = Math.floor(random() * 360);
	const s = 70 + Math.floor(random() * 30);
	const l = 50 + Math.floor(random() * 20);
	return `hsl(${h}, ${s}%, ${l}%)`;
}

function generateBubbles(key: string): Bubble[] {
	const seed = hashString(key);
	const random = createSeededRandom(seed);
	const { bounds } = PHYSICS;
	const range = bounds.max - bounds.min;
	const spawnMin = bounds.min + range * 0.2;
	const spawnRange = range * 0.6;

	const bubbles: Bubble[] = [];
	for (let i = 0; i < VOID_SHAPES.length; i++) {
		const x = spawnMin + random() * spawnRange;
		const y = spawnMin + random() * spawnRange;
		const color = generateHslColor(random);
		const vx = (random() - 0.5) * 18;
		const vy = (random() - 0.5) * 18;
		const targetX = bounds.min + random() * range;
		const targetY = bounds.min + random() * range;
		bubbles.push({ x, y, color, vx, vy, targetX, targetY });
	}
	return bubbles;
}

function computeHexness(time: number, phaseOffset: number): number {
	return smoothstepJs(
		HEXNESS_SMOOTHSTEP_LOW,
		HEXNESS_SMOOTHSTEP_HIGH,
		HEXNESS_BIAS + HEXNESS_AMPLITUDE * Math.sin(time * HEXNESS_FREQUENCY + phaseOffset),
	);
}

const SHAPE_RADIUS = BUBBLE_SIZE * SHAPE_RADIUS_SCALE * VOID_RADIUS_SCALE;
const HEX_CORNER = 2 / Math.sqrt(3);

function shapeExtent(hexAmt: number): number {
	const rr = SHAPE_RADIUS * (1 - (1 - MIN_ROUNDING_RATIO) * hexAmt);
	return (SHAPE_RADIUS - rr) * HEX_CORNER + rr;
}

function applyBondForces(bubbles: Bubble[], time: number, dt: number): void {
	const hexAmts = BONDING.hexOffsets.map((offset) => computeHexness(time, offset));

	for (let i = 0; i < bubbles.length; i++) {
		const extent = shapeExtent(hexAmts[i]);
		const edgeK = BONDING.repulsionK * 2;
		const left = bubbles[i].x - extent;
		const right = VISUAL_EXTENT - bubbles[i].x - extent;
		const top = bubbles[i].y - extent;
		const bottom = VISUAL_EXTENT - bubbles[i].y - extent;
		if (left < 0) bubbles[i].vx -= edgeK * left * dt;
		if (right < 0) bubbles[i].vx += edgeK * right * dt;
		if (top < 0) bubbles[i].vy -= edgeK * top * dt;
		if (bottom < 0) bubbles[i].vy += edgeK * bottom * dt;
	}

	for (let i = 0; i < bubbles.length; i++) {
		for (let j = i + 1; j < bubbles.length; j++) {
			const dx = bubbles[j].x - bubbles[i].x;
			const dy = bubbles[j].y - bubbles[i].y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < 0.001 || dist > BONDING.cutoff) continue;

			const nx = dx / dist;
			const ny = dy / dist;

			const surfaceDist = dist - shapeExtent(hexAmts[i]) - shapeExtent(hexAmts[j]);
			const pairMolecular = Math.min(hexAmts[i], hexAmts[j]);

			const deviation = surfaceDist - BONDING.circleSurfaceGap;
			const strength = 1 - pairMolecular;
			if (strength < 0.01) continue;

			let k = BONDING.springK * strength;
			if (deviation < 0) k += BONDING.repulsionK * strength;

			const force = k * deviation * dt;
			bubbles[i].vx += force * nx;
			bubbles[i].vy += force * ny;
			bubbles[j].vx -= force * nx;
			bubbles[j].vy -= force * ny;
		}
	}
}

// 3D simplex noise

const GRAD3: [number, number, number][] = [
	[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
	[1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
	[0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];
const SKEW_3D = 1 / 3;
const UNSKEW_3D = 1 / 6;

function buildPermTable(seed: number): Uint8Array {
	const p = new Uint8Array(256);
	for (let i = 0; i < 256; i++) p[i] = i;
	const rng = createSeededRandom(seed);
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = p[i];
		p[i] = p[j];
		p[j] = tmp;
	}
	const perm = new Uint8Array(512);
	for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
	return perm;
}

function simplex3d(x: number, y: number, z: number, perm: Uint8Array): number {
	const s = (x + y + z) * SKEW_3D;
	const i = Math.floor(x + s);
	const j = Math.floor(y + s);
	const k = Math.floor(z + s);
	const t = (i + j + k) * UNSKEW_3D;
	const x0 = x - (i - t);
	const y0 = y - (j - t);
	const z0 = z - (k - t);

	let i1: number, j1: number, k1: number;
	let i2: number, j2: number, k2: number;
	if (x0 >= y0) {
		if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
		else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
		else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
	} else {
		if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
		else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
		else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
	}

	const x1 = x0 - i1 + UNSKEW_3D;
	const y1 = y0 - j1 + UNSKEW_3D;
	const z1 = z0 - k1 + UNSKEW_3D;
	const x2 = x0 - i2 + 2 * UNSKEW_3D;
	const y2 = y0 - j2 + 2 * UNSKEW_3D;
	const z2 = z0 - k2 + 2 * UNSKEW_3D;
	const x3 = x0 - 1 + 3 * UNSKEW_3D;
	const y3 = y0 - 1 + 3 * UNSKEW_3D;
	const z3 = z0 - 1 + 3 * UNSKEW_3D;

	const ii = i & 255;
	const jj = j & 255;
	const kk = k & 255;

	let n = 0;
	const corners: [number, number, number][] = [
		[x0, y0, z0], [x1, y1, z1], [x2, y2, z2], [x3, y3, z3],
	];
	const offsets: [number, number, number][] = [
		[0, 0, 0], [i1, j1, k1], [i2, j2, k2], [1, 1, 1],
	];
	for (let c = 0; c < 4; c++) {
		const [cx, cy, cz] = corners[c];
		const r = 0.6 - cx * cx - cy * cy - cz * cz;
		if (r > 0) {
			const [oi, oj, ok] = offsets[c];
			const gi = perm[ii + oi + perm[jj + oj + perm[kk + ok]]] % 12;
			const g = GRAD3[gi];
			const r2 = r * r;
			n += r2 * r2 * (g[0] * cx + g[1] * cy + g[2] * cz);
		}
	}
	return 32 * n;
}

const CURL_EPSILON = 0.1;

function applyCurlForces(
	bubbles: Bubble[],
	time: number,
	dt: number,
	curl: CurlConfig,
	perm: Uint8Array,
): void {
	const t = time * curl.timeScale;
	for (let i = 0; i < bubbles.length; i++) {
		const b = bubbles[i];
		const sx = b.x * curl.noiseScale;
		const sy = b.y * curl.noiseScale;

		let curlX = 0;
		let curlY = 0;
		let freq = 1;
		let amp = 1;
		for (let o = 0; o < curl.octaves; o++) {
			const fsx = sx * freq;
			const fsy = sy * freq;
			const ft = t * freq;
			const dyp = simplex3d(fsx, fsy + CURL_EPSILON, ft, perm);
			const dyn = simplex3d(fsx, fsy - CURL_EPSILON, ft, perm);
			const dxp = simplex3d(fsx + CURL_EPSILON, fsy, ft, perm);
			const dxn = simplex3d(fsx - CURL_EPSILON, fsy, ft, perm);
			curlX += (amp * (dyp - dyn)) / (2 * CURL_EPSILON);
			curlY -= (amp * (dxp - dxn)) / (2 * CURL_EPSILON);
			freq *= 2;
			amp *= 0.5;
		}

		b.vx += curlX * curl.amplitude * dt;
		b.vy += curlY * curl.amplitude * dt;

		const dragFactor = Math.exp(-curl.drag * dt);
		b.vx *= dragFactor;
		b.vy *= dragFactor;

		const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
		if (speed > curl.maxSpeed) {
			const scale = curl.maxSpeed / speed;
			b.vx *= scale;
			b.vy *= scale;
		}

		const EDGE_MARGIN = 20;
		const EDGE_K = 10;
		if (b.x > VISUAL_EXTENT - EDGE_MARGIN) b.vx -= EDGE_K * (b.x - (VISUAL_EXTENT - EDGE_MARGIN)) * dt;
		else if (b.x < EDGE_MARGIN) b.vx += EDGE_K * (EDGE_MARGIN - b.x) * dt;
		if (b.y > VISUAL_EXTENT - EDGE_MARGIN) b.vy -= EDGE_K * (b.y - (VISUAL_EXTENT - EDGE_MARGIN)) * dt;
		else if (b.y < EDGE_MARGIN) b.vy += EDGE_K * (EDGE_MARGIN - b.y) * dt;

		b.x += b.vx * dt;
		b.y += b.vy * dt;

		if (b.x <= 0) { b.x = 0; b.vx = Math.max(0, b.vx); }
		else if (b.x >= VISUAL_EXTENT) { b.x = VISUAL_EXTENT; b.vx = Math.min(0, b.vx); }
		if (b.y <= 0) { b.y = 0; b.vy = Math.max(0, b.vy); }
		else if (b.y >= VISUAL_EXTENT) { b.y = VISUAL_EXTENT; b.vy = Math.min(0, b.vy); }
	}
}

// Gradient class — void preset only, WebGPU

interface GpuState {
	device: GPUDevice;
	context: GPUCanvasContext;
	pipeline: GPURenderPipeline;
	uniformBuffer: GPUBuffer;
	bindGroup: GPUBindGroup;
	maxTextureSize: number;
}

export class Gradient {
	private canvas: HTMLCanvasElement;
	private seed: string;
	private gpu: GpuState | null = null;
	private uniformData: Float32Array | null = null;
	private u32View: Uint32Array | null = null;
	private bubbles: Bubble[] = [];
	private perm: Uint8Array | null = null;
	private animationId: number | null = null;
	private destroyed = false;
	private lastTime = 0;
	private startTime = 0;
	private _error: string | null = null;
	private seamBounds: { axis: 'x' | 'y'; min: number }[] = [];
	private _register = 0;
	private _targetRegister = 0;
	private bubbleRadius = 0;

	constructor(canvas: HTMLCanvasElement, options: { seed?: string } = {}) {
		this.canvas = canvas;
		this.seed = options.seed ?? 'gradient';
	}

	get error(): string | null { return this._error; }
	get maxTextureSize(): number { return this.gpu?.maxTextureSize ?? 8192; }
	get elapsed(): number { return this.startTime ? (performance.now() - this.startTime) / 1000 : 0; }

	private initState(): void {
		this.bubbles = generateBubbles(this.seed);
		this.perm = buildPermTable(hashString(this.seed + '-perm'));

		const width = this.canvas.width;
		const height = this.canvas.height;
		const minSize = Math.min(width, height);
		const uniformData = new Float32Array(BUFFER_SIZE / 4);
		const u32View = new Uint32Array(uniformData.buffer);
		const textureSeed = hashStringToU32(this.seed + '_texture');

		this.bubbleRadius = (BUBBLE_SIZE / 100) * minSize;
		this.uniformData = uniformData;
		this.u32View = u32View;

		uniformData[0] = width;
		uniformData[1] = height;
		uniformData[3] = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		uniformData[4] = this.bubbleRadius * SHAPE_RADIUS_SCALE * VOID_RADIUS_SCALE;
		u32View[5] = VOID_SHAPES.length;
		u32View[6] = textureSeed;
		u32View[7] = 1;
		uniformData[8] = TEXTURE.fineNoise;
		uniformData[9] = TEXTURE.mediumNoise;
		uniformData[10] = TEXTURE.coarseNoise;
		uniformData[11] = TEXTURE.largeScale;
		uniformData[12] = TEXTURE.fiberIntensity;
		uniformData[13] = TEXTURE.opacity;
		u32View[VOID_DOM_RECT_COUNT_INDEX] = 0;
		uniformData[15] = 0.0;
	}

	async start(): Promise<void> {
		if (this.destroyed) return;

		if (!navigator.gpu) {
			this._error = 'WebGPU not supported';
			return;
		}

		try {
			const adapter = await Promise.race([
				navigator.gpu.requestAdapter(),
				new Promise<null>((_, reject) => setTimeout(() => reject(new Error('WebGPU adapter timeout')), 3000)),
			]);
			if (!adapter) { this._error = 'No GPU adapter found'; return; }

			const device = await adapter.requestDevice();
			device.lost.then(() => { this.destroyed = true; this.gpu = null; });

			const context = this.canvas.getContext('webgpu');
			if (!context) { this._error = 'Could not get WebGPU context'; return; }

			const format = navigator.gpu.getPreferredCanvasFormat();
			context.configure({ device, format });

			const bindGroupLayout = device.createBindGroupLayout({
				entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
			});

			const module = device.createShaderModule({ code: voidShader(MAX_SHAPES) });
			const pipeline = device.createRenderPipeline({
				layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
				vertex: { module, entryPoint: 'vs' },
				fragment: { module, entryPoint: 'fs', targets: [{ format }] },
			});

			const uniformBuffer = device.createBuffer({
				size: BUFFER_SIZE,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			});

			const bindGroup = device.createBindGroup({
				layout: bindGroupLayout,
				entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
			});

			const maxTextureSize = device.limits.maxTextureDimension2D;
			this.gpu = { device, context, pipeline, uniformBuffer, bindGroup, maxTextureSize };
			this.initState();

			this.startTime = performance.now();
			this.lastTime = this.startTime;
			requestAnimationFrame(this.render);
		} catch (e) {
			this._error = e instanceof Error ? e.message : 'WebGPU initialization failed';
		}
	}

	private render = (now: number): void => {
		if (this.destroyed || !this.gpu || !this.uniformData || !this.u32View) return;

		const dt = Math.min(now - this.lastTime, 100) / 1000;
		this.lastTime = now;

		const { device, context, pipeline, uniformBuffer, bindGroup } = this.gpu;
		const uniformData = this.uniformData;

		const elapsed = (now - this.startTime) / 1000;

		const REGISTER_SMOOTHING = 2.0;
		this._register += (this._targetRegister - this._register) * Math.min(1, REGISTER_SMOOTHING * dt);

		applyBondForces(this.bubbles, elapsed, dt);

		const reg = this._register;
		const effectiveCurl: CurlConfig = {
			...CURL,
			amplitude: lerp(REG_LOW_CURL_AMP, REG_HIGH_CURL_AMP, reg),
			timeScale: lerp(REG_LOW_CURL_TIME, REG_HIGH_CURL_TIME, reg),
			maxSpeed: lerp(REG_LOW_CURL_SPEED, REG_HIGH_CURL_SPEED, reg),
		};
		applyCurlForces(this.bubbles, elapsed, dt, effectiveCurl, this.perm!);

		const SEAM_BUFFER = 24;
		const SEAM_K = 8;
		for (const bound of this.seamBounds) {
			for (const b of this.bubbles) {
				const val = bound.axis === 'x' ? b.x : b.y;
				const overlap = bound.min + SEAM_BUFFER - val;
				if (overlap > 0) {
					const push = SEAM_K * overlap * dt;
					if (bound.axis === 'x') b.vx += push;
					else b.vy += push;
				}
			}
		}

		// Update uniforms
		uniformData[2] = elapsed;
		uniformData[15] = this._register;
		for (let i = 0; i < this.bubbles.length; i++) {
			const shape = VOID_SHAPES[i];
			const offset = VOID_SHAPES_OFFSET + i * VOID_SHAPE_FLOATS;
			uniformData[offset] = this.bubbles[i].x / VISUAL_EXTENT;
			uniformData[offset + 1] = this.bubbles[i].y / VISUAL_EXTENT;
			uniformData[offset + 2] = computeHexness(elapsed, shape.phaseOffset);
			uniformData[offset + 3] = elapsed * shape.rotationSpeed;
		}

		device.queue.writeBuffer(uniformBuffer, 0, uniformData as Float32Array<ArrayBuffer>);

		const encoder = device.createCommandEncoder();
		const pass = encoder.beginRenderPass({
			colorAttachments: [{
				view: context.getCurrentTexture().createView(),
				loadOp: 'clear',
				storeOp: 'store',
				clearValue: { r: 0, g: 0, b: 0, a: 1 },
			}],
		});
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(6);
		pass.end();

		device.queue.submit([encoder.finish()]);
		this.animationId = requestAnimationFrame(this.render);
	};

	resize(): void {
		if (!this.uniformData) return;
		const width = this.canvas.width;
		const height = this.canvas.height;
		const minSize = Math.min(width, height);
		this.bubbleRadius = (BUBBLE_SIZE / 100) * minSize;

		this.uniformData[0] = width;
		this.uniformData[1] = height;
		this.uniformData[3] = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		this.uniformData[4] = this.bubbleRadius * SHAPE_RADIUS_SCALE * VOID_RADIUS_SCALE;
	}

	setDomRects(rects: DomRectData[]): void {
		if (!this.uniformData || !this.u32View) return;
		const uniformData = this.uniformData;
		const u32View = this.u32View;
		const count = Math.min(rects.length, MAX_DOM_RECTS);
		u32View[VOID_DOM_RECT_COUNT_INDEX] = count;

		const bounds: { axis: 'x' | 'y'; min: number }[] = [];
		const cw = this.canvas.width;
		const ch = this.canvas.height;

		for (let i = 0; i < MAX_DOM_RECTS; i++) {
			const offset = VOID_DOM_RECTS_OFFSET + i * DOM_RECT_FLOATS;
			if (i < count) {
				const r = rects[i];
				uniformData[offset] = r.x;
				uniformData[offset + 1] = r.y;
				uniformData[offset + 2] = r.w;
				uniformData[offset + 3] = r.h;
				uniformData[offset + 4] = r.brightness;
				uniformData[offset + 5] = r.cornerRadius;
				u32View[offset + 6] = r.invert ? 1 : 0;
				uniformData[offset + 7] = 0;

				if (r.invert) {
					if (ch > 0 && r.y > 0 && r.y < ch) bounds.push({ axis: 'y', min: (r.y / ch) * 100 });
					if (cw > 0 && r.x > 0 && r.x < cw) bounds.push({ axis: 'x', min: (r.x / cw) * 100 });
				} else {
					const bottom = r.y + r.h;
					const right = r.x + r.w;
					if (ch > 0 && bottom > 0 && bottom < ch) bounds.push({ axis: 'y', min: (bottom / ch) * 100 });
					if (cw > 0 && right > 0 && right < cw) bounds.push({ axis: 'x', min: (right / cw) * 100 });
				}
			} else {
				for (let f = 0; f < DOM_RECT_FLOATS; f++) uniformData[offset + f] = 0;
			}
		}
		this.seamBounds = bounds;
	}

	setRegister(value: number): void {
		this._targetRegister = clamp(value, 0, 1);
	}

	destroy(): void {
		if (this.animationId !== null) cancelAnimationFrame(this.animationId);
		this.animationId = null;
		this.destroyed = true;
		this.gpu = null;
	}
}
