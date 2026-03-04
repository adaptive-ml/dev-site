export function entrance(
	el: HTMLElement,
	opts: {
		delay?: number;
		duration?: number;
		scale?: number;
		radius?: string;
		onComplete?: () => void;
	} = {},
) {
	const { delay = 0, duration = 500, scale = 0.97, radius = '16px', onComplete } = opts;
	const endRadius = getComputedStyle(el).borderRadius;

	const anim = el.animate(
		[
			{ borderRadius: radius, transform: `scale(${scale})`, opacity: '0', offset: 0 },
			{ borderRadius: radius, transform: 'scale(1)', opacity: '1', offset: 0.2 },
			{ borderRadius: endRadius, transform: 'scale(1)', opacity: '1', offset: 1 },
		],
		{
			duration,
			delay,
			fill: 'both',
			easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
		},
	);

	anim.finished.then(() => {
		anim.cancel();
		onComplete?.();
	});

	return {
		destroy() {
			anim.cancel();
		},
	};
}
