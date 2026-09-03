import { fetchByIds, fetchCollection, fetchResource } from "./client";
import { NotFoundError } from "./errors";
import type { Episode } from "@/types/rickandmorty";

const ALL_EPISODES_REVALIDATE_SECONDS = 60 * 60 * 24;

export function getEpisodeById(id: number): Promise<Episode> {
  return fetchResource<Episode>(`/episode/${id}`, "Episode");
}

export function getEpisodesByIds(ids: number[]): Promise<Episode[]> {
  return fetchByIds<Episode>("/episode", ids);
}

/** The full episode list rarely changes, so it's cached with a long TTL. */
export async function getAllEpisodes(): Promise<Episode[]> {
  const episodes: Episode[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const collection = await fetchCollection<Episode>(
      "/episode",
      { page },
      ALL_EPISODES_REVALIDATE_SECONDS,
    );
    episodes.push(...collection.results);
    totalPages = collection.info.pages || 1;
    page += 1;
  } while (page <= totalPages);

  return episodes;
}

/** The API has no direct "search by code" filter, so this scans the cached full list. */
export async function getEpisodeByCode(code: string): Promise<Episode> {
  const normalized = code.trim().toLowerCase();
  const episodes = await getAllEpisodes();
  const match = episodes.find((episode) => episode.episode.toLowerCase() === normalized);
  if (!match) {
    throw new NotFoundError("Episode");
  }
  return match;
}
