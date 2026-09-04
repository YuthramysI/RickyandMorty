import Image from "next/image";
import Link from "next/link";
import type { Character } from "@/types/rickandmorty";

export function RelatedCharacters({
  characters,
  locationName,
}: {
  characters: Character[];
  locationName: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-bold tracking-[0.15em] uppercase">
        <span className="text-accent">[</span> Also seen at {locationName}{" "}
        <span className="text-accent">]</span>
      </h2>
      <div className="flex flex-wrap gap-3">
        {characters.map((character) => (
          <Link
            key={character.id}
            href={`/characters/${character.id}`}
            className="border-border bg-surface hover:border-accent/60 group flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 transition-colors"
          >
            <span className="relative h-8 w-8 overflow-hidden rounded-full">
              <Image
                src={character.image}
                alt={character.name}
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
            <span className="group-hover:text-accent text-sm font-medium transition-colors">
              <span translate="no">{character.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
