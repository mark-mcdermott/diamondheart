import { error } from '@sveltejs/kit';
import { getMerchProduct } from '$lib/data/merch';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const product = getMerchProduct(params.slug);

	if (!product) {
		error(404, 'Product not found');
	}

	return { product };
};
