import type { Episode } from "@/types/rickandmorty";

export function EpisodeList({ episodes }: { episodes: Episode[] }) {
  if (episodes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-bold tracking-[0.15em] uppercase">
        <span className="text-accent">[</span> Appears in {episodes.length} episode(s){" "}
        <span className="text-accent">]</span>
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {episodes.map((episode) => (
          <li
            key={episode.id}
            className="border-border bg-surface hover:border-accent/50 group flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{episode.name}</p>
              <p className="text-foreground/50 font-mono text-xs">{episode.air_date}</p>
            </div>
            <span className="bg-surface-muted text-accent group-hover:bg-accent group-hover:text-accent-foreground rounded-full px-2 py-1 font-mono text-xs font-medium transition-colors">
              {episode.episode}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
