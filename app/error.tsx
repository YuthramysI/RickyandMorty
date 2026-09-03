"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
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
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="text-danger h-10 w-10" aria-hidden />
      <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase">
        Something went wrong
      </h1>
      <p className="text-foreground/60 max-w-sm text-sm">
        An unexpected error occurred. You can try again, or come back later.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
