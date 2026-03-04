const MAX_DOM_RECTS = 8;
const MIN_ROUNDING_RATIO = 0.32;
const BOND_STRENGTH = 0.5;
const SMIN_EPSILON = 0.001;
const REG_LOW_BRIGHT = 0.03;
const REG_HIGH_BRIGHT = 0.35;
const REG_LOW_STROKE = 1.5;
const REG_HIGH_STROKE = 3.5;

export function voidShader(maxShapes: number): string {
	return /* wgsl */ `
const MAX_SHAPES: u32 = ${maxShapes}u;
const MAX_DOM_RECTS: u32 = ${MAX_DOM_RECTS}u;
const MIN_ROUNDING_RATIO: f32 = ${MIN_ROUNDING_RATIO};
const BOND_STRENGTH: f32 = ${BOND_STRENGTH};
const SMIN_EPSILON: f32 = ${SMIN_EPSILON};
const REG_LOW_BRIGHT: f32 = ${REG_LOW_BRIGHT};
const REG_HIGH_BRIGHT: f32 = ${REG_HIGH_BRIGHT};
const REG_LOW_STROKE: f32 = ${REG_LOW_STROKE};
const REG_HIGH_STROKE: f32 = ${REG_HIGH_STROKE};
const GRAIN_INTENSITY: f32 = 0.05;

struct DomRect {
    rect: vec4f,
    brightness: f32,
    cornerRadius: f32,
    invert: u32,
    _pad: u32,
}

struct ShapeData {
    pos: vec2f,
    hexAmt: f32,
    rotation: f32,
}

struct VoidUniforms {
    size: vec2f,
    time: f32,
    dpr: f32,
    radius: f32,
    shapeCount: u32,
    textureSeed: u32,
    textureEnabled: u32,
    fineNoise: f32,
    mediumNoise: f32,
    coarseNoise: f32,
    largeScale: f32,
    fiberIntensity: f32,
    textureOpacity: f32,
    domRectCount: u32,
    intensity: f32,
    domRects: array<DomRect, MAX_DOM_RECTS>,
    shapes: array<ShapeData, MAX_SHAPES>,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f( 1.0,  1.0),
    );

    var uvs = array<vec2f, 6>(
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 0.0),
        vec2f(0.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(1.0, 0.0),
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = uvs[vertexIndex];
    return output;
}

@group(0) @binding(0) var<uniform> uniforms: VoidUniforms;

fn pcgHash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn noise3(seed: u32) -> vec3f {
    let h = pcgHash(seed);
    return vec3f(
        f32(h & 0x3FFu) / 1023.0,
        f32((h >> 10u) & 0x3FFu) / 1023.0,
        f32((h >> 20u) & 0x3FFu) / 1023.0
    );
}

fn generateTexture(uv: vec2f) -> f32 {
    if (uniforms.textureEnabled == 0u) { return 0.0; }

    let dpr = max(uniforms.dpr, 1.0);
    let x = floor(uv.x * uniforms.size.x / dpr);
    let y = floor(uv.y * uniforms.size.y / dpr);
    let pixelSeed = pcgHash(uniforms.textureSeed ^ (u32(x) + u32(y) * 65536u));
    let noise = noise3(pixelSeed);

    let fineNoise = noise.x * uniforms.fineNoise;
    let mediumNoise = noise.y * uniforms.mediumNoise;
    let coarseNoise = noise.z * uniforms.coarseNoise;

    let largeScaleX = sin(x * 0.005) * cos(y * 0.003);
    let largeScaleY = cos(x * 0.003) * sin(y * 0.007);
    let largeScale = (largeScaleX + largeScaleY) * uniforms.largeScale;

    let fiberX = sin(x * 0.02) * uniforms.fiberIntensity;
    let fiberY = sin(y * 0.015) * uniforms.fiberIntensity;
    let fiber = (fiberX + fiberY) * 0.1;

    return clamp(fineNoise + mediumNoise + coarseNoise + largeScale + fiber, 0.0, 1.0) * uniforms.textureOpacity;
}

fn multiplyBlend(base: f32, darkening: f32) -> f32 {
    return base * (1.0 - darkening);
}

fn sdHex(p: vec2f, s: f32) -> f32 {
    var q = abs(p);
    q -= 2.0 * min(dot(vec2f(-0.8660254, 0.5), q), 0.0) * vec2f(-0.8660254, 0.5);
    q -= vec2f(clamp(q.x, -0.57735027 * s, 0.57735027 * s), s);
    return length(q) * sign(q.y);
}

fn hexSdf(pixelPos: vec2f, center: vec2f, radius: f32, hexAmt: f32, rotation: f32) -> f32 {
    let d = pixelPos - center;
    let c = cos(rotation);
    let s = sin(rotation);
    let p = vec2f(d.x * c + d.y * s, -d.x * s + d.y * c);

    let rr = radius * mix(1.0, MIN_ROUNDING_RATIO, hexAmt);
    return sdHex(p, radius - rr) - rr;
}

fn sdRoundedRect(p: vec2f, rect: vec4f, r: f32) -> f32 {
    let center = rect.xy + rect.zw * 0.5;
    let half = rect.zw * 0.5;
    let d = abs(p - center) - half + r;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - r;
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
    if (k <= SMIN_EPSILON) { return min(a, b); }
    let h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4f {
    let pixelPos = input.uv * uniforms.size;
    let radius = uniforms.radius;
    let n = uniforms.shapeCount;
    let reg = uniforms.intensity;
    let regBright = mix(REG_LOW_BRIGHT, REG_HIGH_BRIGHT, reg);
    let regStroke = mix(REG_LOW_STROKE, REG_HIGH_STROKE, reg) * uniforms.dpr;

    var sdfs: array<f32, MAX_SHAPES>;
    var hexAmts: array<f32, MAX_SHAPES>;
    for (var i = 0u; i < n; i++) {
        let shape = uniforms.shapes[i];
        hexAmts[i] = shape.hexAmt;
        sdfs[i] = hexSdf(pixelPos, shape.pos * uniforms.size, radius, shape.hexAmt, shape.rotation);
    }

    var d = sdfs[0];
    for (var i = 0u; i < n; i++) {
        for (var j = i + 1u; j < n; j++) {
            let k = hexAmts[i] * hexAmts[j] * radius * BOND_STRENGTH;
            d = min(d, smin(sdfs[i], sdfs[j], k));
        }
    }

    var brightness = regBright;
    var finalStroke = regStroke;
    if (uniforms.domRectCount > 0u) {
        let rectMergeK = radius * BOND_STRENGTH * 0.1;
        let dr0 = uniforms.domRects[0];
        var rd0 = sdRoundedRect(pixelPos, dr0.rect, dr0.cornerRadius);
        if (dr0.invert > 0u) { rd0 = -rd0; }
        var rectField = rd0;
        var nearBrightness = dr0.brightness;
        for (var i = 1u; i < uniforms.domRectCount; i++) {
            let dr = uniforms.domRects[i];
            var rd = sdRoundedRect(pixelPos, dr.rect, dr.cornerRadius);
            if (dr.invert > 0u) { rd = -rd; }
            rectField = smin(rectField, rd, rectMergeK);
            if (abs(rd) < abs(rectField)) { nearBrightness = dr.brightness; }
        }

        let proximity = 1.0 - smoothstep(0.0, regStroke * 3.0, abs(rectField));
        brightness = mix(regBright, nearBrightness, proximity);
        finalStroke = mix(regStroke, 1.0, proximity);

        for (var j = 0u; j < n; j++) {
            let k = hexAmts[j] * radius * BOND_STRENGTH;
            d = min(d, smin(rectField, sdfs[j], k));
        }
        d = min(d, rectField);
    }

    let gradLen = max(length(vec2f(dpdx(d), dpdy(d))), 0.0001);
    let screenDist = d / gradLen;
    let edge = brightness * (1.0 - smoothstep(0.0, finalStroke, abs(screenDist)));

    let grainDpr = max(uniforms.dpr, 1.0);
    let gx = u32(floor(input.uv.x * uniforms.size.x / grainDpr));
    let gy = u32(floor(input.uv.y * uniforms.size.y / grainDpr));
    let rawGrain = f32(pcgHash(uniforms.textureSeed ^ (gx + gy * 65536u)) & 0xFFFFu) / 65535.0;
    let grain = rawGrain * GRAIN_INTENSITY;

    let noise = generateTexture(input.uv);
    let edgeMod = edge * (1.0 + (noise * 4.0 - 0.5));

    return vec4f(vec3f(max(grain, max(edgeMod, 0.0))), 1.0);
}
`;
}
