import { CharactersSkeleton } from "@/components/characters/CharactersSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="bg-surface-muted h-8 w-40 animate-pulse rounded-md" />
        <div className="bg-surface-muted h-4 w-72 animate-pulse rounded-md" />
      </div>
      <CharactersSkeleton />
    </div>
  );
}
