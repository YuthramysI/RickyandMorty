import Link from "next/link";
import { ArrowRight, MessageCircle, Search, Sparkles } from "lucide-react";
import { LandingShip } from "@/components/home/LandingShip";

const FEATURES = [
  {
    icon: Search,
    title: "Explore every character",
    description: "Search and filter hundreds of characters by status, species, and gender.",
  },
  {
    icon: Sparkles,
    title: "Real episode data",
    description: "Character pages surface every episode they appear in, sourced live from the API.",
  },
  {
    icon: MessageCircle,
    title: "AI assistant with real answers",
    description:
      "Ask the chat about any character or episode - it calls live API tools instead of guessing.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative flex flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
        <LandingShip className="relative z-10" />

        <span className="border-border bg-surface/70 text-accent relative z-10 rounded-full border px-3 py-1 font-mono text-xs tracking-wide backdrop-blur">
          [ powered by the rick and morty api + gemini function calling ]
        </span>

        <h1 className="font-display text-glow relative z-10 max-w-3xl text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
          EXPLORE THE <span className="text-accent">MULTIVERSE</span>.
          <br />
          <span className="text-accent-2">ASK IT ANYTHING.</span>
        </h1>

        <p className="text-foreground/60 relative z-10 max-w-xl">
          Browse every character and episode, then chat with an assistant that looks up real,
          up-to-date data instead of relying on guesswork.
        </p>

        <Link
          href="/characters"
          className="bg-accent text-accent-foreground glow-border-strong font-display relative z-10 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold tracking-wide uppercase transition-transform hover:scale-105"
        >
          Start exploring
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mx-auto grid w-full max-w-4xl gap-6 px-4 pb-24 sm:grid-cols-3 sm:px-6">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="border-border bg-surface/80 group hover:border-accent/60 relative flex flex-col gap-3 rounded-xl border p-5 backdrop-blur transition-colors hover:shadow-[0_0_28px_-8px_var(--glow-accent)]"
          >
            <span
              aria-hidden
              className="border-accent/0 group-hover:border-accent/70 absolute top-0 left-0 h-4 w-4 rounded-tl-xl border-t-2 border-l-2 transition-colors"
            />
            <span
              aria-hidden
              className="border-accent/0 group-hover:border-accent/70 absolute right-0 bottom-0 h-4 w-4 rounded-br-xl border-r-2 border-b-2 transition-colors"
            />
            <Icon className="text-accent h-6 w-6" aria-hidden />
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">{title}</h2>
            <p className="text-foreground/60 text-sm">{description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
