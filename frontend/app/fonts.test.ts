import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Issue #145: the fonts are loaded by next/font, which fetches them at build
// time and self-hosts them — so the browser never asks a font CDN for
// anything, and the swapped-in face cannot shift the layout because next/font
// generates size-adjusted fallback metrics with it.
//
// jsdom applies no stylesheet rules and the fonts are not in the DOM here, so
// these assertions read the source, the way test/focus-visible.test.ts does.
// What is being pinned is the wiring: the faces are requested through
// next/font, the variables they declare are actually consumed, and no
// stylesheet reaches out to an external origin to fetch one.

const frontendRoot = resolve(__dirname, "..");
const appRoot = join(frontendRoot, "app");

const layout = readFileSync(join(appRoot, "layout.tsx"), "utf8");
const globals = readFileSync(join(appRoot, "globals.css"), "utf8");

/** Every stylesheet and TSX file in the app, for the external-request sweep. */
function appSources(): { path: string; source: string }[] {
  const sources: { path: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (/\.(tsx|css)$/.test(entry.name)) {
        sources.push({ path: entryPath, source: readFileSync(entryPath, "utf8") });
      }
    }
  };
  walk(appRoot);
  return sources;
}

describe("font loading", () => {
  it("loads both faces through next/font, not a stylesheet or a link", () => {
    expect(layout).toMatch(/from "next\/font\/google"/);
    // Sans for the interface, mono for the contract addresses and ids set in
    // `font-mono` — the default system mono was visibly a different face.
    expect(layout).toMatch(/\bGeist\(/);
    expect(layout).toMatch(/\bGeist_Mono\(/);
  });

  it("declares the families as variables and applies them to <html>", () => {
    expect(layout).toContain('variable: "--font-geist-sans"');
    expect(layout).toContain('variable: "--font-geist-mono"');
    // Both variable classes have to reach the element, or the properties they
    // set are never in scope and `var()` resolves to nothing.
    const html = layout.match(/<html[\s\S]*?>/);
    expect(html).not.toBeNull();
    expect(html![0]).toContain("geistSans.variable");
    expect(html![0]).toContain("geistMono.variable");
  });

  it("points the theme at the loaded faces so they are actually applied", () => {
    // Without this the fonts are downloaded and then never used: nothing sets
    // a font-family, so the app renders in whatever the browser defaults to.
    expect(globals).toMatch(/--font-sans:\s*var\(--font-geist-sans\)/);
    expect(globals).toMatch(/--font-mono:\s*var\(--font-geist-mono\)/);
    // `inline` keeps the var() reference intact; resolved at build time it
    // would emit `initial` and silently fall back.
    expect(globals).toMatch(/@theme inline/);
  });

  it("swaps in the fallback rather than blocking, with adjusted metrics", () => {
    expect(layout).not.toMatch(/display:\s*"optional"/);
    expect(layout).not.toMatch(/display:\s*"block"/);
    // A disabled fallback adjustment is what reintroduces layout shift.
    expect(layout).not.toMatch(/adjustFontFallback:\s*false/);
  });

  it("makes no external font request of its own", () => {
    const external = /fonts\.(googleapis|gstatic)\.com|@font-face|@import\s+url\(/;
    for (const entry of appSources()) {
      expect({ path: entry.path, matches: external.test(entry.source) }).toEqual({
        path: entry.path,
        matches: false,
      });
    }
  });
});
