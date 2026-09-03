# Rick and Morty Explorer

[![CI](https://github.com/YuthramysI/RickyandMorty/actions/workflows/ci.yml/badge.svg)](https://github.com/YuthramysI/RickyandMorty/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Browse the Rick and Morty multiverse and chat with an AI assistant that looks up real character and episode data instead of guessing.

**[Live demo](#)** _(add your deployed Vercel URL here)_

![Rick and Morty Explorer demo](docs/demo.gif)

## Features

- **Character browser** - paginated list of every character, with debounced name search and filters for status, species, and gender.
- **Character detail pages** - image, status, species, first appearance, and every episode the character appears in. Origin and current location are enriched with their dimension and type, and the page surfaces other characters last seen at the same location.
- **AI chat with real function calling** - the standout feature. A floating chat assistant, powered by Gemini, answers questions about characters and episodes by calling live tools (`searchCharacters`, `getCharacter`, `getEpisode`, `getCharactersByIds`) that query the Rick and Morty API in real time, instead of relying purely on the model's training data.
- **Context-aware chat** - while viewing a character's detail page, the chat automatically knows which character you're looking at, so you can ask "tell me more about this one" without repeating the name.
- **Streaming responses** - assistant replies stream in token by token, with a "looking things up..." indicator while a tool call is in flight.
- **Light/dark mode**, responsive mobile-first layout, and animated micro-interactions throughout.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Framer Motion](https://motion.dev/) for animations
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) for Gemini function calling
- [Zod](https://zod.dev/) for request/tool-argument validation
- [Rick and Morty API](https://rickandmortyapi.com/) as the data source

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (`corepack enable` will make it available if you don't have it)
- A Gemini API key - create one for free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Setup

```bash
pnpm install
cp .env.example .env.local
```

Open `.env.local` and add your Gemini key:

```
GEMINI_API_KEY=your-key-here
```

Then run the dev server:

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `pnpm dev`          | Start the dev server              |
| `pnpm build`        | Production build                  |
| `pnpm start`        | Run the production build          |
| `pnpm lint`         | Lint the codebase                 |
| `pnpm format`       | Format the codebase with Prettier |
| `pnpm format:check` | Check formatting without writing  |
| `pnpm test`         | Run the unit test suite (Vitest)  |

## Architecture

### Keeping the Gemini API key server-only

The Gemini API key is read exclusively from `process.env.GEMINI_API_KEY` inside a Next.js Route Handler (`app/api/chat/route.ts`), which runs on the server. The browser never sees the key - it only ever talks to `/api/chat` on the same origin. `.env.local` is gitignored, and `.env.example` documents the required variables without real values.

### Function calling

When you send a chat message, `lib/gemini/orchestrate.ts` sends your conversation to Gemini along with a set of tool declarations (`lib/gemini/tools.ts`). If the model decides it needs real data, it responds with a function call instead of text; the server executes the matching handler against the Rick and Morty API (`lib/rickandmorty/`), feeds the result back to Gemini as a function response, and repeats until the model has enough information to answer in natural language (capped at a few rounds to avoid runaway tool loops). The final answer streams back to the browser as newline-delimited JSON events (`tool_call`, `token`, `done`, `error`) over the same POST response body.

If you're on a character's detail page, the client includes that character's id in the request; the server re-fetches the character itself (it never trusts client-supplied detail) and folds a fresh summary into the system prompt, so the model has accurate context without an extra round trip.

### Known limitations

- **Rate limiting** is a simple in-memory, per-IP fixed window (`lib/chat/rateLimit.ts`). It's best-effort: state lives in memory, so it doesn't hold up across cold starts or multiple concurrent serverless instances. Fine for a portfolio demo; a production deployment should swap in something like [`@upstash/ratelimit`](https://github.com/upstash/ratelimit) backed by Redis or Vercel KV.
- **Gemini's free tier is small.** At the time of writing, `gemini-3.5-flash` on the free tier allows only ~20 requests/day per project. The chat surfaces a friendly "hit its usage limit" message instead of a raw error when that happens, but if you're demoing this a lot, either enable billing on the Google Cloud project behind your API key (pay-as-you-go quotas are far higher) or point `GEMINI_MODEL` at a lighter model with more free headroom.
- No authentication or server-side persistence - out of scope for this iteration.

## Testing & CI

A focused Vitest suite covers the parts most worth guarding against regressions: the Rick and Morty API client's retry/caching behavior (`lib/rickandmorty/client.test.ts`), chat request validation (`lib/chat/validation.test.ts`), and the rate limiter (`lib/chat/rateLimit.test.ts`). Run it with `pnpm test`.

Every push and pull request to `main` runs lint, a format check, the build, and the test suite via [GitHub Actions](.github/workflows/ci.yml).

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the `GEMINI_API_KEY` environment variable (and optionally `GEMINI_MODEL` / `RICKANDMORTY_API_BASE`) in the project's Vercel settings.
4. Deploy.

## License

MIT - see [LICENSE](LICENSE).
