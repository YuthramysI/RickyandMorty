import { SearchX } from "lucide-react";

export function EmptyState({
  title = "No characters found",
  description = "Try adjusting your search or filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="border-accent/30 flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
      <SearchX className="text-accent h-10 w-10" aria-hidden />
      <p className="font-display text-sm font-bold tracking-wide uppercase">{title}</p>
      <p className="text-foreground/60 max-w-sm text-sm">{description}</p>
    </div>
  );
}
