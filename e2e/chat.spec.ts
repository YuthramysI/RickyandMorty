import { expect, test } from "@playwright/test";

/**
 * The chat endpoint is stubbed rather than called for real: the assistant runs
 * on Gemini's free tier, whose per-model daily allowance a test suite would
 * drain in a handful of runs, and whose availability is not something a smoke
 * test should depend on.
 *
 * The stub replaces `fetch` rather than intercepting the network, because
 * Playwright's route fulfilment delivers a response body in one piece. That
 * would collapse the whole exchange into a single tick and make the streaming
 * behaviour untestable — which is the one thing this test exists to check.
 * Everything downstream of `fetch` is the real application code.
 */
const STREAM_EVENTS = [
  { type: "tool_call", name: "searchCharacters" },
  { type: "token", value: "Rick Sanchez " },
  { type: "token", value: "is a scientist." },
  { type: "done" },
];

/**
 * Wide enough that each intermediate state is observable by an assertion rather
 * than a race — the tool indicator in particular only exists between the
 * tool_call event and the first token.
 */
const CHUNK_DELAY_MS = 500;

async function stubStreamingChat(page: import("@playwright/test").Page, events: unknown[]) {
  await page.addInitScript(
    ([lines, delay]: [string[], number]) => {
      // The stub is installed first and the observer second: init scripts run
      // before the document exists, and an observer that throws there would
      // abort the rest of this script and silently leave the real endpoint in
      // place — which looks like a passing stub right up until it isn't.
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        if (!url.includes("/api/chat")) return originalFetch(input, init);

        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            for (const line of lines) {
              controller.enqueue(encoder.encode(line + "\n"));
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
            controller.close();
          },
        });

        return Promise.resolve(
          new Response(body, {
            status: 200,
            headers: { "content-type": "application/x-ndjson; charset=utf-8" },
          }),
        );
      };

      const seen: string[] = [];
      (window as unknown as { __renderedStates: string[] }).__renderedStates = seen;
      const watchRenders = () => {
        new MutationObserver(() => {
          const log = document.querySelector('[role="log"]');
          const text = log instanceof HTMLElement ? log.innerText : "";
          if (text && seen[seen.length - 1] !== text) seen.push(text);
        }).observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      };

      if (document.documentElement) watchRenders();
      else document.addEventListener("DOMContentLoaded", watchRenders, { once: true });
    },
    [events.map((event) => JSON.stringify(event)), CHUNK_DELAY_MS] as [string[], number],
  );
}

test("streams a reply token by token and shows the tool-call indicator", async ({ page }) => {
  await stubStreamingChat(page, STREAM_EVENTS);
  await page.goto("/");

  await page.getByLabel("Open chat assistant").click();
  const input = page.getByLabel("Chat message");
  await input.fill("Who is Rick?");
  await input.press("Enter");

  // Shown while a tool call is in flight, before any token has arrived.
  await expect(page.getByText("Searching characters...")).toBeVisible();

  await expect(page.getByText("Rick Sanchez is a scientist.")).toBeVisible();
  await expect(page.getByText("Who is Rick?")).toBeVisible();

  const renderedStates = await page.evaluate(
    () => (window as unknown as { __renderedStates: string[] }).__renderedStates,
  );

  // A partial answer must have been on screen before the complete one, which is
  // only true if tokens were rendered as they arrived rather than in one go.
  const partial = renderedStates.filter(
    (state) => state.includes("Rick Sanchez") && !state.includes("is a scientist."),
  );
  expect(partial.length).toBeGreaterThan(0);
});

test("surfaces a server error without breaking the page", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: "Too many requests. Please slow down." }),
    }),
  );

  await page.goto("/");
  await page.getByLabel("Open chat assistant").click();

  const input = page.getByLabel("Chat message");
  await input.fill("Who is Rick?");
  await input.press("Enter");

  // Scoped to the chat's own alert; Next renders a route announcer with the
  // same role.
  await expect(page.locator('p[role="alert"]')).toContainText("Too many requests");
  // The widget must stay usable rather than falling into the error boundary.
  await expect(input).toBeVisible();
});
