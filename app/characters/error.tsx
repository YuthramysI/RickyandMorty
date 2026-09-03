"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CharactersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <AlertTriangle className="text-danger h-10 w-10" aria-hidden />
      <h1 className="font-display text-lg font-extrabold tracking-wide uppercase">
        Couldn&apos;t load characters
      </h1>
      <p className="text-foreground/60 max-w-sm text-sm">
        The Rick and Morty API might be temporarily unavailable. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
