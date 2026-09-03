import Link from "next/link";
import { Rocket } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <Rocket className="text-accent h-10 w-10" aria-hidden />
      <h1 className="font-display text-glow text-2xl font-extrabold tracking-wide uppercase">
        404 · Lost in the multiverse
      </h1>
      <p className="text-foreground/60 max-w-sm text-sm">
        This page doesn&apos;t exist in this dimension. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        className="bg-accent text-accent-foreground glow-border-strong font-display inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold tracking-wide uppercase hover:opacity-90"
      >
        Back home
      </Link>
    </div>
  );
}
