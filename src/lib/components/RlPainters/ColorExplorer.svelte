<script lang="ts">
    import { untrack } from "svelte";
    import LivingShape from "./LivingShape.svelte";
    import { MODELS, type ModelId } from "./data";
    import lookupData from "./color-lookup.json";

    interface Props {
        hex: string;
        compact?: boolean;
        onHexChange?: (hex: string) => void;
    }
    let { hex, compact = false, onHexChange }: Props = $props();

    const entries = lookupData.entries as number[][];
    const names = lookupData.names as string[];
    const modelOrder = lookupData.order as ModelId[];

    function hexToHsv(hex: string): [number, number, number] {
        const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
        if (!m) return [0, 1, 1];
        const r = parseInt(m[1], 16) / 255;
        const g = parseInt(m[2], 16) / 255;
        const b = parseInt(m[3], 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        let hh = 0;
        if (d > 0) {
            if (max === r) hh = ((g - b) / d) % 6;
            else if (max === g) hh = (b - r) / d + 2;
            else hh = (r - g) / d + 4;
            hh *= 60;
            if (hh < 0) hh += 360;
        }
        return [hh, max === 0 ? 0 : d / max, max];
    }

    const initial = untrack(() => hexToHsv(hex));
    let h = $state(initial[0]);
    let sat = $state(initial[1]);
    let val = $state(initial[2]);

    function hsvToRgb(hue: number, s: number, v: number): [number, number, number] {
        const c = v * s;
        const hp = (hue / 60) % 6;
        const x = c * (1 - Math.abs((hp % 2) - 1));
        let r = 0,
            g = 0,
            b = 0;
        if (hp < 1) {
            r = c;
            g = x;
        } else if (hp < 2) {
            r = x;
            g = c;
        } else if (hp < 3) {
            g = c;
            b = x;
        } else if (hp < 4) {
            g = x;
            b = c;
        } else if (hp < 5) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }
        const m = v - c;
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }

    function toHex(r: number, g: number, b: number): string {
        const p = (n: number) => n.toString(16).padStart(2, "0");
        return `#${p(r)}${p(g)}${p(b)}`;
    }

    const rgb = $derived(hsvToRgb(h, sat, val));
    const currentHex = $derived(toHex(rgb[0], rgb[1], rgb[2]));

    $effect(() => {
        if (onHexChange && currentHex !== hex) onHexChange(currentHex);
    });

    function nearest(r: number, g: number, b: number): number[] {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const dr = e[0] - r;
            const dg = e[1] - g;
            const db = e[2] - b;
            const d = dr * dr + dg * dg + db * db;
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        return entries[bestIdx];
    }

    const match = $derived(nearest(rgb[0], rgb[1], rgb[2]));
    const outputs = $derived({
        base: names[match[3]],
        architect: names[match[4]],
        poet: names[match[5]],
        unhinged: names[match[6]],
    } as Record<ModelId, string>);

    let svEl: HTMLDivElement | undefined;
    let hueEl: HTMLDivElement | undefined;

    function updateDrag(target: "sv" | "hue", e: PointerEvent) {
        const el = target === "sv" ? svEl : hueEl;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        if (target === "sv") {
            sat = x;
            val = 1 - y;
        } else {
            h = x * 360;
        }
    }

    function startDrag(target: "sv" | "hue", e: PointerEvent) {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        updateDrag(target, e);
    }

    function onMove(target: "sv" | "hue", e: PointerEvent) {
        if (e.buttons === 0) return;
        updateDrag(target, e);
    }
</script>

<div class="explorer">
    <div class="picker">
        <div
            bind:this={svEl}
            class="sv-area"
            style:background="linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl({h}, 100%, 50%))"
            onpointerdown={(e) => startDrag("sv", e)}
            onpointermove={(e) => onMove("sv", e)}
            role="slider"
            tabindex="0"
            aria-label="Saturation and brightness"
            aria-valuenow={Math.round(sat * 100)}
        >
            <div class="sv-cursor" style:left="{sat * 100}%" style:top="{(1 - val) * 100}%"></div>
        </div>
        <div
            bind:this={hueEl}
            class="hue-bar"
            onpointerdown={(e) => startDrag("hue", e)}
            onpointermove={(e) => onMove("hue", e)}
            role="slider"
            tabindex="0"
            aria-label="Hue"
            aria-valuenow={Math.round(h)}
        >
            <div class="hue-cursor" style:left="{(h / 360) * 100}%"></div>
        </div>
    </div>
    <div class="results">
        {#each modelOrder as modelId (modelId)}
            {@const model = MODELS[modelId]}
            <div class="result-card">
                <LivingShape
                    sides={model.sides}
                    size={compact ? 26 : 40}
                    stroke="var(--text-dim)"
                    strokeWidth={1.5}
                />
                <div class="result-text">
                    <span class="result-label">{model.label}</span>
                    <span class="result-name">{outputs[modelId]}</span>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .explorer {
        display: flex;
        gap: 32px;
        padding: 24px 32px;
        height: 100%;
        box-sizing: border-box;
        align-items: center;
    }

    .picker {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .sv-area {
        position: relative;
        width: 100%;
        aspect-ratio: 1.7;
        border-radius: 4px;
        border: 1px solid var(--rule);
        cursor: crosshair;
        touch-action: none;
        overflow: hidden;
    }

    .sv-cursor {
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .hue-bar {
        position: relative;
        width: 100%;
        height: 18px;
        border-radius: 4px;
        border: 1px solid var(--rule);
        cursor: pointer;
        touch-action: none;
        background: linear-gradient(
            to right,
            hsl(0, 100%, 50%),
            hsl(60, 100%, 50%),
            hsl(120, 100%, 50%),
            hsl(180, 100%, 50%),
            hsl(240, 100%, 50%),
            hsl(300, 100%, 50%),
            hsl(360, 100%, 50%)
        );
    }

    .hue-cursor {
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 4px;
        border-radius: 2px;
        background: #fff;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
        transform: translateX(-50%);
        pointer-events: none;
    }

    .results {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
    }

    .result-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 16px;
        background: var(--material);
        border: 1px solid var(--rule);
        border-radius: 4px;
        transition:
            border-radius 220ms ease,
            border-color 150ms ease;
    }

    .result-card:hover {
        border-radius: 14px;
        border-color: var(--rule-strong);
    }

    .result-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .result-label {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 500;
        color: var(--text-muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .result-name {
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @container (max-width: 600px) {
        .explorer {
            gap: 12px;
            padding: 12px 14px;
        }

        .picker {
            flex: 1 1 0;
        }

        .sv-area {
            aspect-ratio: 1.4;
        }

        .hue-bar {
            height: 14px;
        }

        .results {
            gap: 6px;
        }

        .result-card {
            padding: 6px 10px;
            gap: 8px;
        }

        .result-label {
            font-size: 9px;
        }

        .result-name {
            font-size: 12px;
        }
    }
</style>
