import { NextResponse } from "next/server";

interface OmdbEpisodeRaw {
  Title?: string;
  Released?: string;
  Episode?: string;
  imdbRating?: string;
  imdbID?: string;
}

export async function GET(request: Request) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OMDB not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get("seriesId");
  const seasonStr = searchParams.get("season");

  if (!seriesId || !/^tt\d+$/.test(seriesId)) {
    return NextResponse.json({ error: "Invalid seriesId" }, { status: 400 });
  }
  const season = Number(seasonStr);
  if (!Number.isInteger(season) || season < 1 || season > 100) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }

  const url = `https://www.omdbapi.com/?i=${encodeURIComponent(seriesId)}&Season=${season}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch from OMDB" },
      { status: 502 },
    );
  }

  const data = await response.json();
  if (data.Response === "False") {
    return NextResponse.json({ episodes: [] });
  }

  const episodes = (data.Episodes || []).map((e: OmdbEpisodeRaw) => ({
    imdbId: e.imdbID,
    title: e.Title,
    episode: Number(e.Episode) || null,
    airDate: e.Released && e.Released !== "N/A" ? e.Released : null,
    imdbRating:
      e.imdbRating && e.imdbRating !== "N/A" ? e.imdbRating : null,
  }));

  return NextResponse.json({ season, episodes });
}
