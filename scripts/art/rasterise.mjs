// Renders the HTML artwork in this folder to sharp WebP files.
// Needs Playwright (`npm i -D playwright`) and Pillow:
//   node scripts/art/rasterise.mjs
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const here = fileURLToPath(new URL(".", import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.CH || undefined });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 2 })).newPage();
for (const name of ["consumer-unit", "test-sheet"]) {
  await page.goto(`file://${here}${name}.html`);
  await page.evaluate(() => document.fonts.ready);
  const png = `${here}${name}.tmp.png`;
  await page.screenshot({ path: png });
  execFileSync("python3", ["-c", `from PIL import Image;import os;i=Image.open(${JSON.stringify(png)}).convert('RGB').resize((1600,1600),Image.LANCZOS);i.save(${JSON.stringify(`${here}../../public/renders/${name}.webp`)},quality=90,method=6);os.remove(${JSON.stringify(png)})`]);
}
await browser.close();
