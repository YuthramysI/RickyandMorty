export function Footer() {
  return (
    <footer className="border-border text-foreground/60 border-t py-8 text-center text-sm shadow-[0_-1px_0_0_var(--glow-accent)]">
      <p className="font-mono text-xs">
        Character and episode data from the{" "}
        <a
          href="https://rickandmortyapi.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent font-medium underline underline-offset-2"
        >
          Rick and Morty API
        </a>
        . Not affiliated with Adult Swim.
      </p>
    </footer>
  );
}
