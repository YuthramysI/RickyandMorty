import { fetchByIds, fetchResource } from "./client";
import type { Location } from "@/types/rickandmorty";

export function getLocationById(id: number): Promise<Location> {
  return fetchResource<Location>(`/location/${id}`, "Location");
}

export function getLocationsByIds(ids: number[]): Promise<Location[]> {
  return fetchByIds<Location>("/location", ids);
}
