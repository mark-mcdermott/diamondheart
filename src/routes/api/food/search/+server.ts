import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
	const apiKey = platform?.env?.USDA_API_KEY || env.USDA_API_KEY;

	if (!apiKey) {
		error(500, 'USDA API key not configured');
	}

	const q = url.searchParams.get('q');
	if (!q || q.trim().length === 0) {
		return json({ foods: [] });
	}

	const apiUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(q)}&dataType=Foundation,SR%20Legacy&pageSize=15`;

	const response = await fetch(apiUrl);
	if (!response.ok) {
		error(502, 'Failed to fetch from USDA API');
	}

	const data = await response.json();

	const foods = (data.foods || []).map((food: UsdaFood) => {
		const nutrients = food.foodNutrients || [];

		const calories = findNutrient(nutrients, 1008);
		const protein = findNutrient(nutrients, 1003);
		const carbs = findNutrient(nutrients, 1005);
		const fat = findNutrient(nutrients, 1004);

		return {
			fdcId: String(food.fdcId),
			description: food.description || '',
			calories: Math.round(calories),
			protein: Math.round(protein),
			carbs: Math.round(carbs),
			fat: Math.round(fat),
			servingSize: food.servingSize ? Math.round(food.servingSize) : 100,
			servingUnit: food.servingSizeUnit || 'g'
		};
	});

	return json({ foods });
};

interface UsdaNutrient {
	nutrientId: number;
	value: number;
}

interface UsdaFood {
	fdcId: number;
	description?: string;
	foodNutrients?: UsdaNutrient[];
	servingSize?: number;
	servingSizeUnit?: string;
}

function findNutrient(nutrients: UsdaNutrient[], nutrientId: number): number {
	const n = nutrients.find((n) => n.nutrientId === nutrientId);
	return n?.value ?? 0;
}
