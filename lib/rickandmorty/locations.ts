import { fetchByIds } from "./client";
import type { Location } from "@/types/rickandmorty";

export function getLocationsByIds(ids: number[]): Promise<Location[]> {
  return fetchByIds<Location>("/location", ids);
}
