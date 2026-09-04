/**
 * `'unsafe-inline'` in `script-src` defeats the main thing a CSP is for: it lets
 * any injected `<script>` run, which is exactly the payload an XSS delivers.
 * Production therefore allows inline scripts only when they carry a per-request
 * nonce that an attacker cannot predict.
 *
 * Development keeps the permissive policy. The dev server injects its own inline
 * scripts for hot reloading and React's dev build needs `eval()` for stack
 * traces; more importantly, a nonce and `'unsafe-inline'` cannot coexist —
 * browsers ignore `'unsafe-inline'` as soon as a nonce is present — so the two
 * environments need genuinely different policies rather than one with extras.
 */
export function buildContentSecurityPolicy(nonce: string | null): string {
  const scriptSrc = nonce ? `'self' 'nonce-${nonce}'` : "'self' 'unsafe-inline' 'unsafe-eval'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Styles split the two vectors rather than allowing both. An injected
    // `<style>` element is the one worth blocking, and the production build
    // ships its CSS as a linked stylesheet, so nothing legitimate needs inline
    // `<style>`. Style *attributes* stay allowed because the animation library
    // writes transforms and opacity directly onto elements, and a nonce cannot
    // be attached to an attribute. On a browser too old for these directives
    // the fallback is `default-src 'self'`: stylesheets still load and only the
    // animations go flat, which is a safe way to degrade.
    ...(nonce
      ? [`style-src-elem 'self' 'nonce-${nonce}'`, "style-src-attr 'unsafe-inline'"]
      : ["style-src 'self' 'unsafe-inline'"]),
    "img-src 'self' data: https://rickandmortyapi.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** Header used to hand the generated nonce to the rendering pass. */
export const NONCE_HEADER = "x-nonce";

export function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
