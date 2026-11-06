// @ts-check
import { defineConfig } from "astro/config";

// Runs at the site root locally. For a GitHub Pages project site, set
// SITE_BASE=/StapledElectricianDemo at build time: every internal link and
// public file goes through asset() in src/data/site.ts.
export default defineConfig({
  site: "https://stapled.co.uk",
  base: process.env.SITE_BASE || "/",
  trailingSlash: "always",
  devToolbar: { enabled: false },
});
