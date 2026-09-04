export interface ViewportMetrics {
  /** Layout-viewport pixels at the bottom hidden behind browser UI or the keyboard. */
  bottomInset: number;
  /** Height the user can actually see right now, or 0 before the first measurement. */
  visibleHeight: number;
}

const SERVER_METRICS: ViewportMetrics = { bottomInset: 0, visibleHeight: 0 };

let cached: ViewportMetrics = SERVER_METRICS;

/**
 * Mobile browsers size the layout viewport as if their URL bar and toolbars
 * weren't there, so a `position: fixed` element pinned to the bottom can render
 * underneath them and stay invisible until the page is scrolled or reloaded.
 * The on-screen keyboard eats the same space. `visualViewport` reports what is
 * genuinely on screen, so measuring the difference gives the offset a bottom
 * dock needs to stay reachable.
 */
function measure(): ViewportMetrics {
  const layoutHeight = document.documentElement.clientHeight;
  const viewport = window.visualViewport;
  if (!viewport) return { bottomInset: 0, visibleHeight: layoutHeight };

  // Pinch-zoom shrinks the visual viewport too, but repositioning mid-gesture
  // just makes the dock slide around under the user's fingers.
  if (viewport.scale > 1) return { bottomInset: 0, visibleHeight: layoutHeight };

  return {
    bottomInset: Math.max(0, Math.round(layoutHeight - viewport.offsetTop - viewport.height)),
    visibleHeight: Math.round(viewport.height),
  };
}

export function getViewportMetrics(): ViewportMetrics {
  const next = measure();
  // Returning a stable reference when nothing moved lets React skip the render;
  // visualViewport fires `scroll` constantly while the page moves.
  if (next.bottomInset !== cached.bottomInset || next.visibleHeight !== cached.visibleHeight) {
    cached = next;
  }
  return cached;
}

export function getServerViewportMetrics(): ViewportMetrics {
  return SERVER_METRICS;
}

export function subscribeViewport(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  viewport?.addEventListener("scroll", onChange);
  window.addEventListener("orientationchange", onChange);

  return () => {
    viewport?.removeEventListener("resize", onChange);
    viewport?.removeEventListener("scroll", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}
