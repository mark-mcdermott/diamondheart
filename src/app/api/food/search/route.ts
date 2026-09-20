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
    // Not a bug — a deployment without the key configured. 503 rather than 500
    // so it reads as "unavailable" in logs, and `reason` lets the UI explain
    // itself instead of showing an empty result list.
    return NextResponse.json(
      {
        error: "Food search isn't set up on this deployment. Add a food manually with Custom.",
        reason: "not_configured",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ foods: [] });
  }

  const apiUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(q)}&dataType=Foundation,SR%20Legacy&pageSize=15`;

  let response: Response;
  try {
    response = await fetch(apiUrl);
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the food database. Try again shortly.", reason: "unreachable" },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          response.status === 403 || response.status === 401
            ? "The food database rejected our key. Check USDA_API_KEY."
            : "The food database is having trouble. Try again shortly.",
        reason: response.status === 403 || response.status === 401 ? "bad_key" : "upstream_error",
      },
      { status: 502 }
    );
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
