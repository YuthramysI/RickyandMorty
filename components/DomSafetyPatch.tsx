"use client";

import { patchDomMutationSafety } from "@/lib/dom-safety";

// Runs when this client chunk is evaluated - before React renders the tree, so
// the guard is in place ahead of any reconciliation the browser's translator
// could interfere with.
patchDomMutationSafety();

export function DomSafetyPatch() {
  return null;
}
