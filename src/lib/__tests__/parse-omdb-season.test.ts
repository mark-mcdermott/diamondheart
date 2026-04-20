import { describe, it, expect } from "vitest";
import { parseOmdbSeasonResponse } from "../../../scripts/seed-demo-data";

describe("parseOmdbSeasonResponse", () => {
  it("normalizes a well-formed OMDb response", () => {
    const data = {
      Title: "Breaking Bad",
      Season: "1",
      Episodes: [
        {
          Title: "Pilot",
          Released: "2008-01-20",
          Episode: "1",
          imdbRating: "9.0",
          imdbID: "tt0959621",
        },
        {
          Title: "Cat's in the Bag...",
          Released: "2008-01-27",
          Episode: "2",
          imdbRating: "8.7",
          imdbID: "tt1054724",
        },
      ],
    };

    expect(parseOmdbSeasonResponse(data)).toEqual([
      { imdbId: "tt0959621", title: "Pilot", episode: 1, airDate: "2008-01-20" },
      { imdbId: "tt1054724", title: "Cat's in the Bag...", episode: 2, airDate: "2008-01-27" },
    ]);
  });

  it("returns an empty array when Episodes is missing", () => {
    expect(parseOmdbSeasonResponse({ Response: "False" })).toEqual([]);
  });

  it("returns an empty array on null/undefined/primitive input", () => {
    expect(parseOmdbSeasonResponse(null)).toEqual([]);
    expect(parseOmdbSeasonResponse(undefined)).toEqual([]);
    expect(parseOmdbSeasonResponse("oops")).toEqual([]);
  });

  it("drops entries missing imdbID", () => {
    const data = {
      Episodes: [
        { Title: "Real", Episode: "1", imdbID: "tt1" },
        { Title: "Orphan", Episode: "2" },
      ],
    };
    const parsed = parseOmdbSeasonResponse(data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].imdbId).toBe("tt1");
  });

  it("drops entries with a non-numeric Episode", () => {
    const data = {
      Episodes: [
        { Title: "Real", Episode: "3", imdbID: "tt3" },
        { Title: "Bad", Episode: "Special", imdbID: "tt-special" },
      ],
    };
    expect(parseOmdbSeasonResponse(data)).toEqual([
      { imdbId: "tt3", title: "Real", episode: 3, airDate: null },
    ]);
  });

  it("maps 'N/A' Released fields to null", () => {
    const data = {
      Episodes: [
        { Title: "Unknown air date", Episode: "1", imdbID: "tt1", Released: "N/A" },
      ],
    };
    expect(parseOmdbSeasonResponse(data)[0].airDate).toBeNull();
  });

  it("falls back to a generic title when Title is missing", () => {
    const data = {
      Episodes: [{ Episode: "5", imdbID: "tt5" }],
    };
    expect(parseOmdbSeasonResponse(data)[0].title).toBe("Episode 5");
  });
});
