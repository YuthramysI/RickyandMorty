import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, generateNonce, NONCE_HEADER } from "@/lib/security/csp";

/**
 * Issues a fresh nonce per request and puts the resulting policy on both the
 * request and the response.
 *
 * The request copy is what Next reads to stamp the nonce onto the script tags
 * it emits itself; the response copy is what the browser enforces. They must
 * carry the same value, so both are derived from one nonce here.
 */
export default function proxy(request: NextRequest) {
  const nonce = process.env.NODE_ENV === "development" ? null : generateNonce();
  const policy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  if (nonce) requestHeaders.set(NONCE_HEADER, nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  /**
   * Static assets are served verbatim and carry no scripts to police, so
   * skipping them avoids paying for a nonce on every image and chunk.
   */
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
