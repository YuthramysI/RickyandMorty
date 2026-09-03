import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-surface-muted animate-pulse rounded-md", className)} />;
}
