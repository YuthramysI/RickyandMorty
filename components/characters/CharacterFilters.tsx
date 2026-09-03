"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const SPECIES_OPTIONS = ["Human", "Alien", "Humanoid", "Robot", "Animal", "Mythological Creature"];

export function CharacterFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [species, setSpecies] = useState(searchParams.get("species") ?? "");
  const [gender, setGender] = useState(searchParams.get("gender") ?? "");

  const debouncedName = useDebouncedValue(name, 350);

  // A single effect drives every navigation from local state, so rapid
  // changes (e.g. clearing the name right before switching a select) are
  // batched into one push instead of racing separate reads of the current
  // URL, which could otherwise silently drop one of the changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedName) params.set("name", debouncedName);
    if (status) params.set("status", status);
    if (species) params.set("species", species);
    if (gender) params.set("gender", gender);
    router.push(`/characters?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, status, species, gender]);

  return (
    <div className="border-border bg-surface/60 glow-border flex flex-col gap-3 rounded-xl border p-3 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          className="text-foreground/40 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by name..."
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="pl-9"
          aria-label="Search characters by name"
        />
      </div>

      <Select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="alive">Alive</option>
        <option value="dead">Dead</option>
        <option value="unknown">Unknown</option>
      </Select>

      <Select
        value={species}
        onChange={(event) => setSpecies(event.target.value)}
        aria-label="Filter by species"
      >
        <option value="">All species</option>
        {SPECIES_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <Select
        value={gender}
        onChange={(event) => setGender(event.target.value)}
        aria-label="Filter by gender"
      >
        <option value="">All genders</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="genderless">Genderless</option>
        <option value="unknown">Unknown</option>
      </Select>
    </div>
  );
}
