import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Only serious and critical violations fail the build. Minor and moderate
 * findings are frequently advisory or contested, and a suite that fails on them
 * gets muted rather than fixed — which is worse than not having it.
 */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

async function blockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

// Both themes are checked: they are separate colour palettes, so a contrast
// regression in one is invisible from the other.
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("the home page has no serious accessibility violations", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      expect(await blockingViolations(page)).toEqual([]);
    });

    test("a character detail page has no serious accessibility violations", async ({ page }) => {
      await page.goto("/characters/1");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      expect(await blockingViolations(page)).toEqual([]);
    });

    test("the open chat widget has no serious accessibility violations", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Open chat assistant").click();
      await expect(page.getByLabel("Chat message")).toBeVisible();

      expect(await blockingViolations(page)).toEqual([]);
    });
  });
}
