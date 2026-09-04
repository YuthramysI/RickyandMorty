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
    // Inline styles stay allowed: Next injects critical CSS inline and the
    // animation library writes element styles directly. Style injection is not
    // a script-execution vector, so this is a materially smaller exposure.
    "style-src 'self' 'unsafe-inline'",
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
