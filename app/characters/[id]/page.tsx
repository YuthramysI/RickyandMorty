import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCharacterById, getEpisodesByIds, NotFoundError } from "@/lib/rickandmorty";
import { CharacterDetail } from "@/components/characters/CharacterDetail";
import { EpisodeList } from "@/components/characters/EpisodeList";
import { SetActiveCharacter } from "@/components/characters/SetActiveCharacter";

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

  const episodeIds = character.episode.map((url) => Number(url.split("/").pop()));
  const episodes = await getEpisodesByIds(episodeIds);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
      <SetActiveCharacter id={character.id} name={character.name} />
      <CharacterDetail character={character} />
      <EpisodeList episodes={episodes} />
    </div>
  );
}
