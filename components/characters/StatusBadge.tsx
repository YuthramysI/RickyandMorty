import type { CharacterStatus } from "@/types/rickandmorty";
import { cn } from "@/lib/utils/cn";

const STATUS_STYLES: Record<CharacterStatus, string> = {
  Alive: "text-accent",
  Dead: "text-danger",
  unknown: "text-foreground/70",
};

const STATUS_DOT: Record<CharacterStatus, string> = {
  Alive: "bg-accent shadow-[0_0_8px_var(--glow-accent)]",
  Dead: "bg-danger",
  unknown: "bg-foreground/40",
};

export function StatusBadge({ status, species }: { status: CharacterStatus; species: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs tracking-wide uppercase",
        STATUS_STYLES[status],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 rounded-full",
          STATUS_DOT[status],
          status === "Alive" && "animate-portal-pulse",
        )}
      />
      {status} · {species}
    </span>
  );
}
