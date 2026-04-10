import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB not configured" });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "movie";

  const apiUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch from TMDB" }, { status: 502 });
  }

  const data = await response.json();

  return NextResponse.json({
    id: data.id,
    title: data.title || data.name,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    overview: data.overview,
    release_date: data.release_date || data.first_air_date,
    vote_average: data.vote_average,
    genres: (data.genres || []).map((g: { name: string }) => g.name),
    runtime: data.runtime || null,
    number_of_seasons: data.number_of_seasons || null,
    number_of_episodes: data.number_of_episodes || null,
    media_type: type,
  });
}
