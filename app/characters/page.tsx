import { Suspense } from "react";
import { getCharacters } from "@/lib/rickandmorty";
import type { CharacterFilters as CharacterFiltersType } from "@/types/rickandmorty";
import { CharacterFilters } from "@/components/characters/CharacterFilters";
import { CharacterGrid } from "@/components/characters/CharacterGrid";
import { CharactersSkeleton } from "@/components/characters/CharactersSkeleton";
import { EmptyState } from "@/components/characters/EmptyState";
import { Pagination } from "@/components/characters/Pagination";

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): CharacterFiltersType {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const page = Number(get("page"));
  const status = get("status");
  const gender = get("gender");

  return {
    name: get("name") || undefined,
    status: status === "alive" || status === "dead" || status === "unknown" ? status : undefined,
    species: get("species") || undefined,
    gender:
      gender === "female" || gender === "male" || gender === "genderless" || gender === "unknown"
        ? gender
        : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

async function CharacterResults({ filters }: { filters: CharacterFiltersType }) {
  const collection = await getCharacters(filters);

  if (collection.results.length === 0) {
    return (
      <EmptyState
        title="No characters found"
        description="Try a different name or loosen your filters — the multiverse is big, but not that big."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CharacterGrid characters={collection.results} />
      <Pagination
        currentPage={filters.page ?? 1}
        totalPages={collection.info.pages}
        searchParams={{
          name: filters.name,
          status: filters.status,
          species: filters.species,
          gender: filters.gender,
        }}
      />
    </div>
  );
}

export default async function CharactersPage(props: PageProps<"/characters">) {
  const rawSearchParams = await props.searchParams;
  const filters = parseFilters(rawSearchParams);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-glow text-2xl font-extrabold tracking-wide uppercase">
          Characters
        </h1>
        <p className="text-foreground/60 text-sm">
          Browse, search, and filter every character across the multiverse.
        </p>
      </div>

      <CharacterFilters />

      <Suspense key={JSON.stringify(filters)} fallback={<CharactersSkeleton />}>
        <CharacterResults filters={filters} />
      </Suspense>
    </div>
  );
}
