import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, generateNonce } from "./csp";

function directive(policy: string, name: string): string | undefined {
  return policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
}

describe("buildContentSecurityPolicy", () => {
  it("never allows inline scripts in production", () => {
    const policy = buildContentSecurityPolicy("abc123");

    // The property this whole nonce mechanism exists to guarantee. If a future
    // edit reintroduces 'unsafe-inline' here, the CSP stops defending against
    // the injected <script> an XSS delivers - so it fails the build instead.
    expect(directive(policy, "script-src")).toBe("script-src 'self' 'nonce-abc123'");
  });

  it("blocks injected style elements while letting the animation library write attributes", () => {
    const policy = buildContentSecurityPolicy("abc123");

    expect(directive(policy, "style-src-elem")).toBe("style-src-elem 'self' 'nonce-abc123'");
    expect(directive(policy, "style-src-attr")).toBe("style-src-attr 'unsafe-inline'");
    // A bare style-src would take precedence over the split directives.
    expect(directive(policy, "style-src")).toBeUndefined();
  });

  it("keeps the permissive policy in development, where no nonce is issued", () => {
    const policy = buildContentSecurityPolicy(null);

    // The dev server injects its own inline scripts and React's dev build needs
    // eval(); a nonce cannot simply be added on top, because browsers ignore
    // 'unsafe-inline' as soon as one is present.
    expect(directive(policy, "script-src")).toContain("'unsafe-inline'");
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
  });

  it("locks down the directives an attacker would otherwise pivot through", () => {
    const policy = buildContentSecurityPolicy("abc123");

    expect(directive(policy, "default-src")).toBe("default-src 'self'");
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "base-uri")).toBe("base-uri 'self'");
    expect(directive(policy, "form-action")).toBe("form-action 'self'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
    expect(directive(policy, "connect-src")).toBe("connect-src 'self'");
  });
});

describe("generateNonce", () => {
  it("produces a fresh value per call", () => {
    const nonces = new Set(Array.from({ length: 100 }, generateNonce));

    // A predictable nonce is the same as no nonce at all.
    expect(nonces.size).toBe(100);
  });

  it("emits only characters that are valid unquoted in a CSP header", () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/=_-]+$/);
  });
});
