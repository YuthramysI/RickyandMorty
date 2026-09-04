import { afterEach, describe, expect, it, vi } from "vitest";
import { toolDeclarations, toolHandlers } from "./tools";
import * as rickAndMorty from "@/lib/rickandmorty";
import type { Episode } from "@/types/rickandmorty";

function episode(id: number, code: string): Episode {
  return {
    id,
    name: `Episode ${id}`,
    air_date: "December 2, 2013",
    episode: code,
    characters: ["https://rickandmortyapi.com/api/character/1"],
    url: `https://rickandmortyapi.com/api/episode/${id}`,
    created: "2017-11-10T12:56:33.798Z",
  };
}

const SERIES = [
  episode(1, "S01E01"),
  episode(2, "S01E02"),
  episode(3, "S02E01"),
  episode(4, "S03E01"),
];

afterEach(() => vi.restoreAllMocks());

describe("listEpisodes", () => {
  it("is declared to the model, so aggregate questions are answerable at all", () => {
    expect(toolDeclarations.map((tool) => tool.name)).toContain("listEpisodes");
  });

  it("answers 'how many episodes are there' without dumping the whole list", async () => {
    vi.spyOn(rickAndMorty, "getAllEpisodes").mockResolvedValue(SERIES);

    const result = await toolHandlers.listEpisodes({});

    expect(result.totalEpisodes).toBe(4);
    expect(result.seasons).toEqual([
      { season: 1, episodeCount: 2 },
      { season: 2, episodeCount: 1 },
      { season: 3, episodeCount: 1 },
    ]);
    // Keeping 50+ episodes out of the context is the point of the summary form.
    expect(result.episodes).toBeUndefined();
  });

  it("returns the episode list only when a season is requested", async () => {
    vi.spyOn(rickAndMorty, "getAllEpisodes").mockResolvedValue(SERIES);

    const result = await toolHandlers.listEpisodes({ season: 1 });

    expect(result.found).toBe(true);
    expect(result.episodes).toHaveLength(2);
  });

  it("reports a missing season as data rather than throwing", async () => {
    vi.spyOn(rickAndMorty, "getAllEpisodes").mockResolvedValue(SERIES);

    const result = await toolHandlers.listEpisodes({ season: 9 });

    // A throw would kill the stream; the model needs to read this and rephrase.
    expect(result.found).toBe(false);
    expect(result.error).toContain("season 9");
  });
});
