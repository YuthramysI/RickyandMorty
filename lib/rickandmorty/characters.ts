import { fetchByIds, fetchCollection, fetchResource } from "./client";
import type { ApiCollection, Character, CharacterFilters } from "@/types/rickandmorty";

export function getCharacters(filters: CharacterFilters = {}): Promise<ApiCollection<Character>> {
  return fetchCollection<Character>("/character", {
    name: filters.name,
    status: filters.status,
    species: filters.species,
    gender: filters.gender,
    page: filters.page,
  });
}

export function getCharacterById(id: number): Promise<Character> {
  return fetchResource<Character>(`/character/${id}`, "Character");
}

export function getCharactersByIds(ids: number[]): Promise<Character[]> {
  return fetchByIds<Character>("/character", ids);
}
