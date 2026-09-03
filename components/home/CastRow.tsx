"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Character } from "@/types/rickandmorty";

export function CastRow({ characters }: { characters: Character[] }) {
  return (
    <div className="relative z-10 flex -space-x-4">
      {characters.map((character, index) => (
        <motion.div
          key={character.id}
          initial={{ opacity: 0, y: 16, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: index * 0.08 }}
          whileHover={{ y: -6, scale: 1.08, zIndex: 20 }}
          className="relative"
        >
          <Link
            href={`/characters/${character.id}`}
            title={character.name}
            className="border-background bg-surface glow-border block h-14 w-14 overflow-hidden rounded-full border-2 sm:h-16 sm:w-16"
          >
            <Image
              src={character.image}
              alt={character.name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
