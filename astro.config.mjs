// @ts-check
import { defineConfig } from "astro/config";

// Runs at the site root locally. The GitHub Pages workflow sets
// SITE_BASE=/stapled-electrician-demo at build time: every internal link and
// public file goes through asset() in src/data/site.ts.
export default defineConfig({
  site: "https://matthewstapley.github.io",
  base: process.env.SITE_BASE || "/",
  trailingSlash: "always",
  devToolbar: { enabled: false },
});
