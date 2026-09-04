import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ChatContextProvider } from "@/components/chat/ChatContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PortalSwirl } from "@/components/ui/PortalSwirl";
import { DomSafetyPatch } from "@/components/DomSafetyPatch";
import { NONCE_HEADER } from "@/lib/security/csp";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Rick and Morty Explorer",
  description:
    "Browse the Rick and Morty multiverse and chat with an AI assistant that looks up real character and episode data.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The theme script has to run inline before first paint to avoid a flash of
  // the wrong theme, so it needs the request's nonce to satisfy the CSP.
  // Reading it opts every route into dynamic rendering, which is inherent to
  // nonce-based CSP: a nonce baked in at build time would be the same for
  // everyone and would defend against nothing.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <DomSafetyPatch />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-30 flex items-start justify-center overflow-hidden opacity-[var(--nebula-opacity)] blur-2xl"
        >
          <PortalSwirl size={900} className="-translate-y-1/4" />
        </div>
        <ThemeProvider>
          <ChatContextProvider>
            <Navbar />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <ChatWidget />
          </ChatContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
