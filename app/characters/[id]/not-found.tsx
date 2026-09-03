import Link from "next/link";
import { Ghost } from "lucide-react";

export default function CharacterNotFound() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <Ghost className="text-accent h-10 w-10" aria-hidden />
      <h1 className="font-display text-glow text-lg font-extrabold tracking-wide uppercase">
        This character doesn&apos;t exist in this dimension
      </h1>
      <p className="text-foreground/60 max-w-sm text-sm">
        Double-check the link, or head back to browse every known character.
      </p>
      <Link
        href="/characters"
        className="bg-accent text-accent-foreground glow-border-strong font-display inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold tracking-wide uppercase hover:opacity-90"
      >
        Back to characters
      </Link>
    </div>
  );
}
