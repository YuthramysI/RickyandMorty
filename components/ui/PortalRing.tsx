import { cn } from "@/lib/utils/cn";

/** A small spinning portal-ring mark, used as the site logo and loading accents. */
export function PortalRing({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("animate-portal-spin relative inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: "conic-gradient(from 0deg, var(--accent), var(--accent-2), var(--accent))",
      }}
    >
      <span className="bg-background absolute inset-[3px] rounded-full" />
    </span>
  );
}
