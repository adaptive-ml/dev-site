<script lang="ts">
	let { sides = 6, size = 120, stroke = 'var(--text-muted)', strokeWidth = 1.5 }: {
		sides?: number;
		size?: number;
		stroke?: string;
		strokeWidth?: number;
	} = $props();

	function roundedPolygonPath(n: number, sz: number, sw: number, t: number): string {
		const r = sz / 2 - sw;
		const cx = sz / 2;
		const cy = sz / 2;

		const vertices: [number, number][] = [];
		for (let i = 0; i < n; i++) {
			const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
			vertices.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
		}

		// t=0: faceted polygon with rounded corners. t=1: circle.
		const cornerRadius = t * r;
		const maxCorner = r * Math.sin(Math.PI / n) * 0.95;
		const cr = Math.min(cornerRadius, maxCorner);

		if (cr < 0.5) {
			return vertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${v[0]},${v[1]}`).join(' ') + 'Z';
		}

		const parts: string[] = [];
		for (let i = 0; i < n; i++) {
			const prev = vertices[(i - 1 + n) % n];
			const curr = vertices[i];
			const next = vertices[(i + 1) % n];

			const dx1 = prev[0] - curr[0], dy1 = prev[1] - curr[1];
			const dx2 = next[0] - curr[0], dy2 = next[1] - curr[1];
			const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
			const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

			const offset = Math.min(cr, len1 / 2, len2 / 2);

			const p1x = curr[0] + (dx1 / len1) * offset;
			const p1y = curr[1] + (dy1 / len1) * offset;
			const p2x = curr[0] + (dx2 / len2) * offset;
			const p2y = curr[1] + (dy2 / len2) * offset;

			if (i === 0) {
				parts.push(`M${p1x},${p1y}`);
			} else {
				parts.push(`L${p1x},${p1y}`);
			}
			parts.push(`Q${curr[0]},${curr[1]} ${p2x},${p2y}`);
		}

		const first = vertices[0];
		const last = vertices[n - 1];
		const dx1 = last[0] - first[0], dy1 = last[1] - first[1];
		const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
		const offset = Math.min(cr, len1 / 2);
		const closePt = `${first[0] + (dx1 / len1) * offset},${first[1] + (dy1 / len1) * offset}`;
		parts.push(`L${closePt}`);
		parts.push('Z');

		return parts.join(' ');
	}

	let time = $state(0);
	let frame: number;

	function tick() {
		time = performance.now();
		frame = requestAnimationFrame(tick);
	}

	$effect(() => {
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const morph = $derived((Math.sin(time / 2000) + 1) / 2);
	const scale = $derived(1 + Math.sin(time / 3000) * 0.03);
	const path = $derived(roundedPolygonPath(sides, size, strokeWidth, morph));
</script>

<svg
	class="living-shape"
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	style:transform="scale({scale})"
>
	<path
		d={path}
		fill="none"
		{stroke}
		stroke-width={strokeWidth}
	/>
</svg>

<style>
	.living-shape {
		flex-shrink: 0;
		will-change: transform;
	}
</style>
