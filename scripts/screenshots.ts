// Visual check of the local app in an isolated headless Chromium (Playwright).
// Fresh profile every run: no access to any personal browser data.
// Signs in with the local-only test account from .env (BROWSER_TEST_*),
// then screenshots the main pages at desktop and phone sizes.
//
// Run (dev server must be up): npx tsx --env-file=.env scripts/screenshots.ts [outDir] [baseUrl]
// Output defaults to screenshots/ (gitignored).
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const outDir = path.resolve(process.argv[2] ?? "screenshots");
const base = process.argv[3] ?? "http://localhost:3000";
const email = process.env.BROWSER_TEST_EMAIL;
const password = process.env.BROWSER_TEST_PASSWORD;
if (!email || !password) {
  console.error("Set BROWSER_TEST_EMAIL and BROWSER_TEST_PASSWORD in .env");
  process.exit(1);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) {
  console.error("Refusing to run against a non-local URL.");
  process.exit(1);
}

const viewports = {
  desktop: { width: 1366, height: 900 },
  phone: { width: 390, height: 844 },
};

async function shot(page: Page, name: string, fullPage = false) {
  const file = path.join(outDir, `${name}.png`);
  // caret: "initial" stops Playwright injecting a caret-color style, which
  // React would report as a (false) hydration mismatch.
  await page.screenshot({ path: file, fullPage, caret: "initial" });
  console.log("saved", path.relative(process.cwd(), file));
}

(async () => {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const errors: string[] = [];
  for (const [label, viewport] of Object.entries(viewports)) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`[${label}] console: ${m.text()}`));

    await page.goto(`${base}/login`);
    await shot(page, `${label}-login`);
    await page.fill("#email", email);
    await page.fill("#password", password);
    await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);
    await page.waitForLoadState("networkidle");
    await shot(page, `${label}-list`);

    // Open a recipe with sections if there is one, else the first card.
    const cards = page.locator("ul li a");
    const marlenka = page.locator('ul li a:has-text("Marlenka")');
    // Client-side navigation: wait for the URL, not just the load state.
    await Promise.all([
      page.waitForURL(/\/recipes\/[^/]+$/),
      ((await marlenka.count()) ? marlenka.first() : cards.first()).click(),
    ]);
    await page.waitForLoadState("networkidle");
    await shot(page, `${label}-recipe`);
    await shot(page, `${label}-recipe-full`, true);

    await page.goto(`${base}/recipes/new`);
    await shot(page, `${label}-new`);
    await page.goto(`${base}/trash`);
    await shot(page, `${label}-trash`);
    await ctx.close();
  }
  await browser.close();
  if (errors.length) {
    console.log("\nBrowser errors:\n" + errors.join("\n"));
    process.exit(2);
  }
  console.log("\nNo browser errors.");
})();
