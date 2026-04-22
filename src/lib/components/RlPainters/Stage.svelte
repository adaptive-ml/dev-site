<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";
    import LivingShape from "./LivingShape.svelte";
    import ColorExplorer from "./ColorExplorer.svelte";
    import { MODELS, JUDGES, SAMPLE_COLORS, type ModelId, type JudgeId } from "./data";

    let containerWidth = $state(1024);
    const compact = $derived(containerWidth < 600);

    const color = SAMPLE_COLORS[0];
    const defaultHex = color.hex;

    interface Rollout {
        text: string;
        reward?: number;
        highlight?: "above" | "below";
    }

    interface Column {
        modelId: ModelId;
        rollouts?: Rollout[];
    }

    interface StepState {
        text: string;
        columns: Column[];
        judges?: { id: JudgeId; active?: boolean }[];
        groupAvg?: number;
        interactive?: boolean;
    }

    const baseRollouts = ["Sandy Beige", "Salmon Dust", "Terracotta", "Muted Coral"];
    const rewards = [0.3, 0.7, 0.9, 0.2];
    const avg = rewards.reduce((s, n) => s + n, 0) / rewards.length;

    const STEPS: StepState[] = [
        {
            text: 'We have a <a href="/training/llm">model</a> tasked with naming paint colors.',
            columns: [{ modelId: "base" }],
        },
        {
            text: `It generates a rollout: <strong>${color.names.base}</strong>.`,
            columns: [{ modelId: "base", rollouts: [{ text: color.names.base }] }],
        },
        {
            text: "We want to train the model to name paint colors like it's a <strong>Poet</strong>. To do this, we clone the base model and use reinforcement learning (RL).",
            columns: [{ modelId: "base" }, { modelId: "poet" }],
        },
        {
            text: 'We need to define a <a href="/rewards">reward</a>, which tells the model whether its response is good or bad.',
            columns: [{ modelId: "base" }, { modelId: "poet", rollouts: [{ text: color.names.base, reward: 0.5 }] }],
        },
        {
            text: 'A reward can come from anywhere. In this case, we\'ll use <a href="/evaluation/llm-as-judge">AI Judges</a>. These are larger models that assign a reward.',
            columns: [{ modelId: "base" }, { modelId: "poet" }],
            judges: [{ id: "correctness" }, { id: "poet" }],
        },
        {
            text: "The first judge is a correctness judge, which checks if the color name is accurate.",
            columns: [{ modelId: "base" }, { modelId: "poet" }],
            judges: [{ id: "correctness", active: true }, { id: "poet" }],
        },
        {
            text: "The second judge is a poet judge, which checks if the color name is poetic.",
            columns: [{ modelId: "base" }, { modelId: "poet" }],
            judges: [{ id: "correctness" }, { id: "poet", active: true }],
        },
        {
            text: "Let's start training. Generate multiple rollouts for the provided prompt.",
            columns: [{ modelId: "base" }, { modelId: "poet", rollouts: baseRollouts.map((text) => ({ text })) }],
            judges: [{ id: "correctness" }, { id: "poet" }],
        },
        {
            text: "Assign a reward to each rollout using our AI Judges. Compute the group average.",
            columns: [
                { modelId: "base" },
                {
                    modelId: "poet",
                    rollouts: baseRollouts.map((text, i) => ({ text, reward: rewards[i] })),
                },
            ],
            judges: [
                { id: "correctness", active: true },
                { id: "poet", active: true },
            ],
            groupAvg: avg,
        },
        {
            text: 'Reinforce the model to generate above-average responses. This technique of comparing to the group average is called <a href="/optimization/grpo">GRPO</a>.',
            columns: [
                { modelId: "base" },
                {
                    modelId: "poet",
                    rollouts: baseRollouts.map((text, i) => ({
                        text,
                        reward: rewards[i],
                        highlight: rewards[i] > avg ? "above" : "below",
                    })),
                },
            ],
            judges: [{ id: "correctness" }, { id: "poet" }],
            groupAvg: avg,
        },
        {
            text: "The trained <strong>Poet</strong> model differs from the base model.",
            columns: [
                { modelId: "base", rollouts: [{ text: color.names.base }] },
                { modelId: "poet", rollouts: [{ text: color.names.poet }] },
            ],
        },
        {
            text: "We can do the same for two other models: <strong>Architect</strong> and <strong>Unhinged</strong>, using a different AI Judge for each.",
            columns: [
                { modelId: "base", rollouts: [{ text: color.names.base }] },
                { modelId: "poet", rollouts: [{ text: color.names.poet }] },
                { modelId: "architect", rollouts: [{ text: color.names.architect }] },
                { modelId: "unhinged", rollouts: [{ text: color.names.unhinged }] },
            ],
            judges: [{ id: "architect" }, { id: "poet" }, { id: "unhinged" }],
        },
        {
            text: 'Try any color. See how each model names it. You may notice the trained models collapse to fewer colors. This is called <a href="/rewards/reward-hacking">reward hacking</a>, and can be addressed with techniques like <a href="/data/synthetic-data">synthetic data generation</a>, <a href="/rewards/rlvr">verifiable rewards</a>, and <a href="/optimization/rejection-sampling">rejection sampling</a>. Explore the glossary to learn more.',
            columns: [],
            interactive: true,
        },
    ];

    const params = $derived(browser ? $page.url.searchParams : new URLSearchParams());
    const showSplash = $derived(!params.has("step"));
    const step = $derived.by(() => {
        const raw = parseInt(params.get("step") ?? "0");
        if (!Number.isFinite(raw)) return 0;
        return Math.max(0, Math.min(STEPS.length - 1, raw));
    });
    const exploreHex = $derived.by(() => {
        const raw = params.get("hex");
        return raw && /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : defaultHex;
    });
    const current = $derived(STEPS[step]);

    const modelSize = $derived(compact ? 60 : 80);
    const modelGap = $derived(compact ? 12 : 32);
    const judgeSize = $derived(compact ? 28 : 32);

    function setParams(updates: Record<string, string | null>) {
        if (!browser) return;
        const url = new URL($page.url);
        for (const [k, v] of Object.entries(updates)) {
            if (v) url.searchParams.set(k, v);
            else url.searchParams.delete(k);
        }
        goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
    }

    function goToStep(s: number) {
        const clamped = Math.max(0, Math.min(STEPS.length - 1, s));
        setParams({ step: String(clamped) });
    }

    function nextStep() {
        goToStep(step + 1);
    }

    function prevStep() {
        if (step === 0) setParams({ step: null });
        else goToStep(step - 1);
    }

    function onHexChange(h: string) {
        setParams({ hex: h.toLowerCase() === defaultHex.toLowerCase() ? null : h.slice(1) });
    }

    function visibleLength(html: string): number {
        return html.replace(/<[^>]*>/g, "").length;
    }

    function sliceHtml(html: string, chars: number): string {
        let out = "";
        let visible = 0;
        let i = 0;
        const len = html.length;
        while (i < len && visible < chars) {
            if (html[i] === "<") {
                const end = html.indexOf(">", i);
                if (end === -1) {
                    out += html[i++];
                } else {
                    out += html.slice(i, end + 1);
                    i = end + 1;
                }
            } else {
                out += html[i++];
                visible++;
            }
        }
        return out;
    }

    let revealChars = $state(0);
    const totalChars = $derived(visibleLength(current.text));
    const revealedHtml = $derived(sliceHtml(current.text, revealChars));
    const isRevealing = $derived(revealChars < totalChars);

    $effect(() => {
        const text = current.text;
        const hide = showSplash;
        const total = visibleLength(text);
        if (hide) {
            revealChars = total;
            return;
        }
        revealChars = 0;
        if (!browser) {
            revealChars = total;
            return;
        }
        const STEP_CHARS = 4;
        const TICK_MS = 14;
        const id = window.setInterval(() => {
            revealChars = Math.min(revealChars + STEP_CHARS, total);
            if (revealChars >= total) window.clearInterval(id);
        }, TICK_MS);
        return () => window.clearInterval(id);
    });

    function skipReveal(e: MouseEvent) {
        if ((e.target as Element).closest("a")) return;
        revealChars = totalChars;
    }
</script>

<div class="workstation" bind:clientWidth={containerWidth}>
    <div class="stage">
        {#if showSplash}
            <div class="splash">
                <h1 class="splash-title">RL Painters</h1>
                <p class="splash-desc">
                    Learn how reinforcement learning works. Step through the training process, then try it yourself.
                </p>
                <button class="splash-btn" onclick={() => goToStep(0)}>start</button>
            </div>
        {:else}
        <div class="header">
            <div class="prompt-bar">
                <span class="section-label">Prompt</span>
                <span class="prompt-value">
                    <span class="color-chip" style:background={current.interactive ? exploreHex : color.hex}></span>
                    {#if compact}
                        {current.interactive ? exploreHex : color.hex}
                    {:else}
                        Name this paint color: {current.interactive ? exploreHex : color.hex}
                    {/if}
                </span>
            </div>

            <div class="judges-row">
                {#if current.judges?.length}
                    {#each current.judges as judge, ji (ji)}
                        {@const info = JUDGES[judge.id]}
                        <div class="judge" class:active={judge.active}>
                            <LivingShape
                                sides={info.sides}
                                size={judgeSize}
                                stroke={judge.active ? "var(--text)" : "var(--text-faint)"}
                                strokeWidth={1.5}
                            />
                            <span class="judge-name">{info.label}</span>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>

        <div class="battlefield">
            {#if current.interactive}
                <ColorExplorer hex={exploreHex} {onHexChange} {compact} />
            {:else}
                <div class="models-row" style="--model-gap: {modelGap}px">
                    {#each current.columns as column, ci (ci)}
                    {@const model = MODELS[column.modelId]}
                    <div class="model-station">
                        {#if column.rollouts?.length}
                            {@const hasRewards = column.rollouts.some((r) => r.reward !== undefined)}
                            {@const multi = column.rollouts.length > 1}
                            {@const reserveReward = multi || hasRewards}
                            <div class="bubble" class:compact={!multi}>
                                <div class="rollouts" class:multi class:with-reward={reserveReward}>
                                    {#each column.rollouts as r, ri (ri)}
                                        <div
                                            class="rollout"
                                            class:above={r.highlight === "above"}
                                            class:below={r.highlight === "below"}
                                        >
                                            {#if multi}
                                                <span class="rollout-label">{String.fromCharCode(65 + ri)}.</span>
                                            {/if}
                                            <span class="rollout-text">{r.text}</span>
                                            {#if reserveReward}
                                                <span class="reward"
                                                    >{r.reward !== undefined ? r.reward.toFixed(1) : ""}</span
                                                >
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                                <span class="bubble-tail" aria-hidden="true"></span>
                                {#if hasRewards && current.groupAvg !== undefined}
                                    <span class="bubble-avg">avg: {current.groupAvg.toFixed(2)}</span>
                                {/if}
                            </div>
                        {/if}
                        <div class="model">
                            <LivingShape
                                sides={model.sides}
                                size={modelSize}
                                stroke="var(--text-dim)"
                                strokeWidth={1.5}
                            />
                            <span class="model-label">{model.label}</span>
                        </div>
                    </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="dialogue-box">
            <button class="nav-edge" onclick={prevStep} aria-label="Previous step">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                    ><path d="M10 3L5 8l5 5" /></svg
                >
            </button>
            <div
                class="dialogue-scroll"
                class:revealing={isRevealing}
                onclick={skipReveal}
                role="presentation"
            >
                <span class="dialogue-text">{@html revealedHtml}</span>
            </div>
            <button class="nav-edge" onclick={nextStep} disabled={step === STEPS.length - 1} aria-label="Next step">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                    ><path d="M6 3l5 5-5 5" /></svg
                >
            </button>
        </div>
        {/if}
    </div>
    {#if !showSplash}
        <span class="nav-counter">{step + 1}/{STEPS.length}</span>
    {/if}
</div>

<style>
    .section-label {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 500;
        color: var(--text-faint);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    /* -- layout -- */

    .workstation {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 0;
        container-type: inline-size;
    }

    .stage {
        display: flex;
        flex-direction: column;
        width: min(960px, 100%);
        height: 640px;
        border: 1px solid var(--rule);
        border-radius: 4px;
        overflow: hidden;
    }

    .splash {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 22px;
        padding: 64px 32px;
    }

    .splash-title {
        font-family: var(--font-mono);
        font-size: 32px;
        font-weight: 700;
        color: var(--text);
        margin: 0;
        letter-spacing: -0.01em;
    }

    .splash-desc {
        font-size: 15px;
        color: var(--text-dim);
        margin: 0;
        max-width: 420px;
        line-height: 1.6;
    }

    .splash-btn {
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 600;
        color: var(--void);
        background: var(--text);
        border: none;
        padding: 10px 32px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 8px;
        transition: border-radius 200ms ease;
    }

    .splash-btn:hover {
        border-radius: 18px;
    }

    /* -- header (prompt + judges) -- */

    .header {
        flex: 0 0 80px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        padding: 0 24px;
        border-bottom: 1px solid var(--rule);
    }

    .prompt-bar {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-left: 2px solid var(--rule-strong);
        padding-left: 12px;
    }

    .prompt-value {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 15px;
        font-weight: 600;
        color: var(--text-body);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .color-chip {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 1px solid var(--rule);
        flex-shrink: 0;
    }

    .judges-row {
        flex: 0 0 240px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 14px;
        height: 48px;
    }

    .judge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        opacity: 0.45;
        transition: opacity 220ms ease;
        animation: judge-in 280ms cubic-bezier(0.22, 1.05, 0.36, 1) backwards;
    }

    .judge.active {
        opacity: 1;
    }

    .judge-name {
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 500;
        color: var(--text-muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .judge.active .judge-name {
        color: var(--text);
    }

    @keyframes judge-in {
        from {
            opacity: 0;
            transform: translateX(18px);
        }
    }

    /* -- battlefield: models zone -- */

    .battlefield {
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: auto;
        overflow-y: visible;
        position: relative;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .battlefield::-webkit-scrollbar {
        display: none;
    }

    .models-row {
        display: flex;
        justify-content: flex-start;
        align-items: flex-end;
        gap: var(--model-gap);
        padding: 24px 32px;
        min-width: max-content;
        height: 100%;
        box-sizing: border-box;
    }

    .model-station {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        min-width: 170px;
    }

    .model {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
    }

    .model-label {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 500;
        color: var(--text-muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    /* -- speech bubble -- */

    .bubble {
        position: absolute;
        bottom: calc(100% + 16px);
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 14px 8px;
        background: var(--material);
        border: 1px solid var(--rule);
        border-radius: 4px;
        transition:
            border-radius 220ms ease,
            border-color 150ms ease;
        z-index: 1;
        animation: bubble-in 320ms cubic-bezier(0.22, 1.35, 0.36, 1) backwards;
    }

    .bubble.compact {
        padding: 8px 14px;
    }

    .bubble:hover {
        border-radius: 14px;
        border-color: var(--rule-strong);
    }

    @keyframes bubble-in {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(6px) scale(0.92);
        }
    }

    .bubble-tail {
        position: absolute;
        left: 50%;
        bottom: -7px;
        width: 12px;
        height: 7px;
        transform: translateX(-50%);
        pointer-events: none;
    }

    .bubble-tail::before,
    .bubble-tail::after {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
    }

    .bubble-tail::before {
        border-top: 7px solid var(--rule);
    }

    .bubble-tail::after {
        top: -1px;
        border-top: 7px solid var(--material);
    }

    .bubble-avg {
        position: absolute;
        bottom: calc(100% + 4px);
        right: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-muted);
        letter-spacing: 0.02em;
        white-space: nowrap;
    }

    .rollouts {
        display: grid;
        grid-template-columns: auto;
        row-gap: 3px;
        align-items: baseline;
    }

    .rollouts.with-reward:not(.multi) {
        grid-template-columns: auto 3ch;
        column-gap: 14px;
    }

    .rollouts.multi {
        grid-template-columns: auto auto 3ch;
        column-gap: 12px;
    }

    .rollout {
        display: contents;
    }

    .rollout-label {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 500;
        color: var(--text-faint);
        letter-spacing: 0.02em;
    }

    .rollout.above .rollout-label {
        color: var(--text-muted);
    }

    .rollout-text {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
        color: var(--text-body);
        text-align: left;
        white-space: nowrap;
    }

    .rollout.above .rollout-text {
        color: var(--text);
        font-weight: 600;
    }

    .rollout.below .rollout-text {
        color: var(--text-faint);
    }

    .reward {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-muted);
        text-align: right;
        letter-spacing: 0.02em;
        white-space: nowrap;
    }

    .rollout.above .reward {
        color: var(--text);
        font-weight: 600;
    }

    /* -- dialogue box: fixed height, scrolls internally -- */

    .dialogue-box {
        flex: 0 0 112px;
        display: flex;
        align-items: stretch;
        border-top: 1px solid var(--rule);
        min-height: 0;
        position: relative;
    }

    .nav-edge {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        border: none;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
        transition:
            color 150ms ease,
            background 150ms ease;
    }

    .nav-edge:first-of-type {
        border-right: 1px solid var(--rule);
    }

    .nav-edge:last-of-type {
        border-left: 1px solid var(--rule);
    }

    .nav-edge:hover:not(:disabled) {
        color: var(--text);
        background: var(--hover-fill);
    }

    .nav-edge:disabled {
        opacity: 0.25;
        cursor: default;
    }

    .dialogue-scroll {
        flex: 1 1 auto;
        overflow-y: auto;
        scrollbar-gutter: stable;
        min-height: 0;
        min-width: 0;
        padding: 14px 20px 24px;
    }

    .dialogue-scroll.revealing {
        cursor: pointer;
    }

    .dialogue-text {
        font-size: 16px;
        color: var(--text-body);
        line-height: 1.5;
    }

    .dialogue-text :global(a) {
        color: var(--text);
        text-decoration: underline;
        text-decoration-color: var(--text-faint);
        text-underline-offset: 0.2em;
    }

    .dialogue-text :global(a:hover) {
        text-decoration-color: var(--text);
    }

    .dialogue-text :global(strong) {
        color: var(--text);
        font-weight: 600;
    }

    .nav-counter {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-faint);
        letter-spacing: 0.04em;
    }

    /* -- compact -- */

    @container (max-width: 600px) {
        .stage {
            width: 100%;
            height: 540px;
        }

        .header {
            flex-basis: 64px;
            padding: 0 14px;
            gap: 12px;
        }

        .prompt-value {
            font-size: 13px;
        }

        .judges-row {
            flex-basis: 196px;
            gap: 10px;
            height: 42px;
        }

        .judge-name {
            font-size: 8px;
        }

        .models-row {
            padding: 16px 20px;
        }

        .model-station {
            min-width: 100px;
        }

        .bubble {
            padding: 8px 10px 6px;
            bottom: calc(100% + 12px);
        }

        .rollout-text {
            font-size: 11px;
        }

        .reward {
            font-size: 10px;
        }

        .dialogue-box {
            flex-basis: 92px;
        }

        .dialogue-scroll {
            padding: 10px 12px 22px;
        }

        .dialogue-text {
            font-size: 14px;
        }

        .nav-edge {
            width: 44px;
        }
    }
</style>
