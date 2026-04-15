import { NextResponse } from "next/server";

function parseNumeric(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

function parseGenres(value: unknown): string[] {
  if (typeof value !== "string" || value === "N/A") return [];
  return value.split(",").map((g) => g.trim()).filter(Boolean);
}

function cleanField(value: unknown): string | null {
  if (typeof value !== "string" || value === "N/A" || value.length === 0) {
    return null;
  }
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OMDB not configured" }, { status: 500 });
  }

  const { id } = await params;
  if (!/^tt\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid IMDb ID" }, { status: 400 });
  }

  const url = `https://www.omdbapi.com/?i=${encodeURIComponent(id)}&plot=full&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch from OMDB" },
      { status: 502 },
    );
  }

  const data = await response.json();
  if (data.Response === "False") {
    return NextResponse.json({ error: data.Error || "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    imdbId: data.imdbID,
    title: data.Title,
    type: data.Type === "series" ? "show" : "movie",
    year: cleanField(data.Year),
    posterUrl: cleanField(data.Poster),
    overview: cleanField(data.Plot),
    releaseDate: cleanField(data.Released),
    genres: parseGenres(data.Genre),
    runtime: parseNumeric(data.Runtime),
    seasonCount: parseNumeric(data.totalSeasons),
    imdbRating: cleanField(data.imdbRating),
  });
}
