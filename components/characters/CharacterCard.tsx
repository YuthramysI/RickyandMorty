"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Character } from "@/types/rickandmorty";
import { StatusBadge } from "./StatusBadge";

export function CharacterCard({ character, index }: { character: Character; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`/characters/${character.id}`}
        className="group border-border bg-surface hover:border-accent/70 relative flex h-full flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-[0_0_28px_-6px_var(--glow-accent)]"
      >
        <span
          aria-hidden
          className="border-accent/0 group-hover:border-accent absolute top-0 left-0 z-10 h-5 w-5 rounded-tl-xl border-t-2 border-l-2 transition-colors duration-300"
        />
        <span
          aria-hidden
          className="border-accent/0 group-hover:border-accent absolute right-0 bottom-0 z-10 h-5 w-5 rounded-br-xl border-r-2 border-b-2 transition-colors duration-300"
        />
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={character.image}
            alt={character.name}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="via-background/0 to-background/90 absolute inset-0 bg-gradient-to-t from-transparent" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h2 className="font-display group-hover:text-accent truncate text-sm font-bold tracking-wide uppercase transition-colors">
            <span translate="no">{character.name}</span>
          </h2>
          <StatusBadge status={character.status} species={character.species} />
        </div>
      </Link>
    </motion.div>
  );
}
