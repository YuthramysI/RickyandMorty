import Image from "next/image";
import type { Character } from "@/types/rickandmorty";
import { StatusBadge } from "./StatusBadge";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-surface/60 flex flex-col gap-1 rounded-lg border p-3">
      <dt className="text-accent font-mono text-[0.65rem] tracking-[0.15em] uppercase">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function CharacterDetail({ character }: { character: Character }) {
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr]">
      <div className="border-accent/40 glow-border relative aspect-square w-full overflow-hidden rounded-xl border">
        <Image
          src={character.image}
          alt={character.name}
          fill
          sizes="240px"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-glow text-2xl font-extrabold tracking-wide uppercase">
            {character.name}
          </h1>
          <StatusBadge status={character.status} species={character.species} />
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoRow label="Gender" value={character.gender} />
          <InfoRow label="Origin" value={character.origin.name} />
          <InfoRow label="Last known location" value={character.location.name} />
          {character.type && <InfoRow label="Type" value={character.type} />}
        </dl>
      </div>
    </div>
  );
}
