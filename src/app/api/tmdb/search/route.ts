import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [], error: "TMDB not configured" });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "movie";

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const apiUrl = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(query)}&api_key=${apiKey}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    return NextResponse.json({ results: [], error: "Failed to fetch from TMDB" }, { status: 502 });
  }

  const data = await response.json();

  const results = (data.results || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    title: item.title || item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    overview: item.overview,
    release_date: item.release_date || item.first_air_date,
    vote_average: item.vote_average,
    media_type: type,
  }));

  return NextResponse.json({ results });
}
