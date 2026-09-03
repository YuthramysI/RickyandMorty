import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCharacterById,
  getCharactersByIds,
  getEpisodesByIds,
  getLocationsByIds,
  idFromUrl,
  NotFoundError,
} from "@/lib/rickandmorty";
import { CharacterDetail } from "@/components/characters/CharacterDetail";
import { EpisodeList } from "@/components/characters/EpisodeList";
import { RelatedCharacters } from "@/components/characters/RelatedCharacters";
import { SetActiveCharacter } from "@/components/characters/SetActiveCharacter";
import type { Character, Location } from "@/types/rickandmorty";

const MAX_RELATED_CHARACTERS = 6;

async function loadCharacter(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return await getCharacterById(id);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

/** Origin and current location are the same resource in a lot of episodes, so
 * this resolves both with a single batched request instead of two. */
async function loadLocations(
  character: Character,
): Promise<{ origin: Location | null; location: Location | null }> {
  const originId = idFromUrl(character.origin.url);
  const locationId = idFromUrl(character.location.url);
  const ids = [
    ...new Set([originId, locationId].filter((value): value is number => value !== null)),
  ];
  if (ids.length === 0) return { origin: null, location: null };

  const locations = await getLocationsByIds(ids);
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  return {
    origin: originId !== null ? (byId.get(originId) ?? null) : null,
    location: locationId !== null ? (byId.get(locationId) ?? null) : null,
  };
}

export async function generateMetadata(props: PageProps<"/characters/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const character = await loadCharacter(id);
  if (!character) return { title: "Character not found" };
  return {
    title: `${character.name} | Rick and Morty Explorer`,
    description: `${character.name} - ${character.status} ${character.species} from ${character.origin.name}.`,
  };
}

export default async function CharacterPage(props: PageProps<"/characters/[id]">) {
  const { id } = await props.params;
  const character = await loadCharacter(id);
  if (!character) notFound();

  const episodeIds = character.episode
    .map(idFromUrl)
    .filter((value): value is number => value !== null);
  const [episodes, { origin, location }] = await Promise.all([
    getEpisodesByIds(episodeIds),
    loadLocations(character),
  ]);

  const residentIds = (location?.residents ?? [])
    .map(idFromUrl)
    .filter(
      (residentId): residentId is number => residentId !== null && residentId !== character.id,
    )
    .slice(0, MAX_RELATED_CHARACTERS);
  const relatedCharacters = residentIds.length > 0 ? await getCharactersByIds(residentIds) : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
      <SetActiveCharacter id={character.id} name={character.name} />
      <CharacterDetail
        character={character}
        origin={origin}
        location={location}
        firstEpisode={episodes[0] ?? null}
      />
      <EpisodeList episodes={episodes} />
      {relatedCharacters.length > 0 && location && (
        <RelatedCharacters characters={relatedCharacters} locationName={location.name} />
      )}
    </div>
  );
}
