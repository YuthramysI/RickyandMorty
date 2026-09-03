import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

function buildHref(page: number, searchParams: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/characters?${params.toString()}`;
}

export function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav className="flex items-center justify-center gap-4" aria-label="Pagination">
      <Link
        href={buildHref(currentPage - 1, searchParams)}
        aria-disabled={prevDisabled}
        aria-label="Previous page"
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(
          "border-border inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
          prevDisabled ? "pointer-events-none opacity-40" : "hover:border-accent hover:text-accent",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span
        className="text-foreground/70 font-mono text-xs tracking-wide uppercase"
        aria-current="page"
      >
        Page {currentPage} / {totalPages}
      </span>
      <Link
        href={buildHref(currentPage + 1, searchParams)}
        aria-disabled={nextDisabled}
        aria-label="Next page"
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(
          "border-border inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
          nextDisabled ? "pointer-events-none opacity-40" : "hover:border-accent hover:text-accent",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
