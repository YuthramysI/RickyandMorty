import { Sparkles } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  searchCharacters: "Searching characters...",
  getCharacter: "Looking up character details...",
  getEpisode: "Looking up episode details...",
  listEpisodes: "Counting up the episode list...",
  getCharactersByIds: "Gathering character details...",
};

export function ToolCallIndicator({ name }: { name: string }) {
  return (
    <div className="border-border bg-surface-muted/60 text-accent flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs">
      <Sparkles className="h-4 w-4 animate-pulse" aria-hidden />
      <span>{TOOL_LABELS[name] ?? "Looking up Rick and Morty data..."}</span>
    </div>
  );
}
