type PatchedWindow = Window & { __domMutationSafetyPatched?: boolean };

/**
 * Browser auto-translate (and some extensions) rewrite text nodes React owns.
 * When React later tries to remove or reposition one of those nodes it throws
 * `NotFoundError: Failed to execute 'removeChild' on 'Node'`, which takes the
 * whole page down. Marking volatile subtrees `translate="no"` prevents most of
 * it; this is the safety net for anything that slips through: instead of
 * throwing, the mutation is skipped (or appended) so the app keeps running.
 */
export function patchDomMutationSafety(): void {
  if (typeof window === "undefined") return;

  const patchedWindow = window as PatchedWindow;
  if (patchedWindow.__domMutationSafetyPatched) return;
  patchedWindow.__domMutationSafetyPatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    // Append instead of dropping it, so the content still reaches the page.
    if (child && child.parentNode !== this) return originalInsertBefore.call(this, node, null) as T;
    return originalInsertBefore.call(this, node, child) as T;
  };
}
