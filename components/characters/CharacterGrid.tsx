import type { Character } from "@/types/rickandmorty";
import { CharacterCard } from "./CharacterCard";

export function CharacterGrid({ characters }: { characters: Character[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {characters.map((character, index) => (
        <CharacterCard key={character.id} character={character} index={index} />
      ))}
    </div>
  );
}
