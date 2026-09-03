import { RICK_AND_MORTY_API_BASE } from "@/lib/constants";
import { NotFoundError, RickAndMortyApiError } from "./errors";
import type { ApiCollection } from "@/types/rickandmorty";

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${RICK_AND_MORTY_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request(
  path: string,
  params?: Record<string, string | number | undefined>,
  revalidateSeconds = 3600,
): Promise<Response> {
  const url = buildUrl(path, params);
  const response = await fetch(url, { next: { revalidate: revalidateSeconds } });
  if (!response.ok && response.status !== 404) {
    throw new RickAndMortyApiError(
      `Rick and Morty API request failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  return response;
}

/**
 * For single-resource lookups (e.g. /character/1) a 404 means the resource
 * genuinely doesn't exist.
 */
export async function fetchResource<T>(
  path: string,
  resourceLabel: string,
  revalidateSeconds?: number,
): Promise<T> {
  const response = await request(path, undefined, revalidateSeconds);
  if (response.status === 404) {
    throw new NotFoundError(resourceLabel);
  }
  return (await response.json()) as T;
}

/**
 * For filtered list endpoints (e.g. /character?name=zzz), the API responds
 * with 404 when no results match — that's an empty collection, not an error.
 */
export async function fetchCollection<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  revalidateSeconds?: number,
): Promise<ApiCollection<T>> {
  const response = await request(path, params, revalidateSeconds);
  if (response.status === 404) {
    return { info: { count: 0, pages: 0, next: null, prev: null }, results: [] };
  }
  return (await response.json()) as ApiCollection<T>;
}

/**
 * For multi-id lookups (e.g. /character/1,2,3), the API returns a single
 * object instead of an array when exactly one id is requested.
 */
export async function fetchByIds<T>(
  path: string,
  ids: number[],
  revalidateSeconds?: number,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const response = await request(`${path}/${ids.join(",")}`, undefined, revalidateSeconds);
  if (response.status === 404) return [];
  const data = (await response.json()) as T | T[];
  return Array.isArray(data) ? data : [data];
}
