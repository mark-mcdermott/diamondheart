import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "USDA API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ foods: [] });
  }

  const apiUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(q)}&dataType=Foundation,SR%20Legacy&pageSize=15`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch from USDA API" }, { status: 502 });
  }

  const data = await response.json();

  const foods = (data.foods || []).map((food: UsdaFood) => {
    const nutrients = food.foodNutrients || [];
    return {
      fdcId: String(food.fdcId),
      description: food.description || "",
      calories: Math.round(findNutrient(nutrients, 1008)),
      protein: Math.round(findNutrient(nutrients, 1003)),
      carbs: Math.round(findNutrient(nutrients, 1005)),
      fat: Math.round(findNutrient(nutrients, 1004)),
      servingSize: food.servingSize ? Math.round(food.servingSize) : 100,
      servingUnit: food.servingSizeUnit || "g",
    };
  });

  return NextResponse.json({ foods });
}
