import { NextResponse } from "next/server";

interface OmdbSearchItem {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string;
  Poster: string;
}

export async function GET(request: Request) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [], error: "OMDB not configured" });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const omdbType = type === "show" ? "series" : type === "movie" ? "movie" : "";
  const params = new URLSearchParams({ s: query, apikey: apiKey });
  if (omdbType) params.set("type", omdbType);

  const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  if (!response.ok) {
    return NextResponse.json(
      { results: [], error: "Failed to fetch from OMDB" },
      { status: 502 },
    );
  }

  const data = await response.json();
  if (data.Response === "False") {
    return NextResponse.json({ results: [] });
  }

  const results = (data.Search || []).map((item: OmdbSearchItem) => ({
    imdbId: item.imdbID,
    title: item.Title,
    year: item.Year,
    type: item.Type === "series" ? "show" : "movie",
    posterUrl: item.Poster && item.Poster !== "N/A" ? item.Poster : null,
  }));

  return NextResponse.json({ results });
}
