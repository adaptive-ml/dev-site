import { getNode, getAllPaths } from '$lib/data';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const entries: EntryGenerator = () => {
	return getAllPaths().map((p) => ({ path: p.join('/') }));
};

export const load: PageLoad = ({ params }) => {
	const segments = params.path.split('/');
	const node = getNode(segments);
	if (!node) throw error(404, 'Not found');

	const breadcrumbs = segments.map((seg, i) => ({
		title: getNode(segments.slice(0, i + 1))?.title ?? seg,
		path: segments.slice(0, i + 1).join('/')
	}));

	return { node, segments, breadcrumbs };
};
