import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import {
  getCharacterById,
  getCharacters,
  getCharactersByIds,
  getEpisodeByCode,
  getEpisodeById,
  NotFoundError,
} from "@/lib/rickandmorty";
import type { Character, Episode } from "@/types/rickandmorty";

const MAX_SEARCH_RESULTS = 8;

function summarizeCharacter(character: Character) {
  return {
    id: character.id,
    name: character.name,
    status: character.status,
    species: character.species,
    gender: character.gender,
    origin: character.origin.name,
    location: character.location.name,
    image: character.image,
    episodeCount: character.episode.length,
  };
}

function summarizeEpisode(episode: Episode) {
  return {
    id: episode.id,
    name: episode.name,
    code: episode.episode,
    airDate: episode.air_date,
    characterCount: episode.characters.length,
  };
}

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "searchCharacters",
    description:
      "Search Rick and Morty characters by name and/or filter by status, species, and gender. Returns a short list of matches, not full detail.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Partial or full character name to search for." },
        status: {
          type: Type.STRING,
          enum: ["alive", "dead", "unknown"],
          description: "Filter by life status.",
        },
        species: { type: Type.STRING, description: "Filter by species, e.g. Human, Alien." },
        gender: {
          type: Type.STRING,
          enum: ["female", "male", "genderless", "unknown"],
          description: "Filter by gender.",
        },
        page: { type: Type.INTEGER, description: "Page number for pagination, starting at 1." },
      },
    },
  },
  {
    name: "getCharacter",
    description:
      "Get full detail for a single character by its numeric id, including which episodes it appears in.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER, description: "The character's numeric id." },
      },
      required: ["id"],
    },
  },
  {
    name: "getEpisode",
    description:
      "Get detail for a single episode by its numeric id or by its code (e.g. 'S01E01'), including which characters appear in it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER, description: "The episode's numeric id." },
        code: { type: Type.STRING, description: "The episode code, e.g. 'S01E01'." },
      },
    },
  },
  {
    name: "getCharactersByIds",
    description:
      "Batch-fetch several characters at once by their numeric ids, e.g. to resolve every character appearing in an episode.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ids: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: "List of character numeric ids.",
        },
      },
      required: ["ids"],
    },
  },
];

const searchCharactersArgs = z.object({
  name: z.string().optional(),
  status: z.enum(["alive", "dead", "unknown"]).optional(),
  species: z.string().optional(),
  gender: z.enum(["female", "male", "genderless", "unknown"]).optional(),
  page: z.number().int().positive().optional(),
});

const getCharacterArgs = z.object({ id: z.number().int().positive() });

const getEpisodeArgs = z
  .object({ id: z.number().int().positive().optional(), code: z.string().optional() })
  .refine((args) => args.id !== undefined || args.code !== undefined, {
    message: "Either id or code must be provided.",
  });

const getCharactersByIdsArgs = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(20),
});

function idsFromEpisode(episode: Episode): number[] {
  return episode.characters.map((url) => Number(url.split("/").pop()));
}

/** Dispatch map executed by the tool-calling orchestration loop. Each handler
 * returns a plain JSON-serializable object suitable for a Gemini function response. */
export const toolHandlers: Record<string, (rawArgs: unknown) => Promise<Record<string, unknown>>> =
  {
    async searchCharacters(rawArgs) {
      const args = searchCharactersArgs.parse(rawArgs ?? {});
      const collection = await getCharacters(args);
      return {
        totalCount: collection.info.count,
        results: collection.results.slice(0, MAX_SEARCH_RESULTS).map(summarizeCharacter),
      };
    },

    async getCharacter(rawArgs) {
      const { id } = getCharacterArgs.parse(rawArgs);
      try {
        const character = await getCharacterById(id);
        const episodeIds = character.episode.map((url) => Number(url.split("/").pop()));
        return {
          found: true,
          character: {
            ...summarizeCharacter(character),
            type: character.type || null,
            episodeIds,
          },
        };
      } catch (error) {
        if (error instanceof NotFoundError) {
          return { found: false, error: `No character exists with id ${id}.` };
        }
        throw error;
      }
    },

    async getEpisode(rawArgs) {
      const { id, code } = getEpisodeArgs.parse(rawArgs);
      try {
        const episode = id !== undefined ? await getEpisodeById(id) : await getEpisodeByCode(code!);
        return {
          found: true,
          episode: { ...summarizeEpisode(episode), characterIds: idsFromEpisode(episode) },
        };
      } catch (error) {
        if (error instanceof NotFoundError) {
          return {
            found: false,
            error: `No episode found for ${code ? `code ${code}` : `id ${id}`}.`,
          };
        }
        throw error;
      }
    },

    async getCharactersByIds(rawArgs) {
      const { ids } = getCharactersByIdsArgs.parse(rawArgs);
      const characters = await getCharactersByIds(ids);
      return { characters: characters.map(summarizeCharacter) };
    },
  };
