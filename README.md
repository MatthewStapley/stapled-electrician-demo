# Linework Electrical: a Stapled. website concept

A concept website for independent UK electricians, built by
[Stapled.](https://stapled.co.uk) to show prospective clients. **Linework
Electrical is a fictional business.** The site says so in the bar on every page,
in the footer title block and on `/concept/`. All pages are `noindex`.

The quote form does not send or store anything. The phone number comes from
Ofcom's range for fiction and the email uses a reserved `.example` domain, so
contact actions open an explanation instead of dialling or composing.

## Run it

Requires Node 22.12 or newer.

Astro is pinned to the 7.3 line with `~7.3.8`. Astro 7.4 raises its Node minimum,
so only widen that range once your Node version meets the new requirement.
Installing on Node below 22.19 prints an `EBADENGINE` warning for `undici`. It
belongs to Astro's Fonts feature, which this site doesn't use, and the build
doesn't load it.

```sh
npm install
npm run dev       # http://localhost:4321/
npm run build     # static output in dist/
npm run preview   # serves the build
npm run check     # Astro and TypeScript checks
```

## Publishing

Live at <https://matthewstapley.github.io/stapled-electrician-demo/>. Every push
to `main` runs `.github/workflows/deploy.yml`, which type-checks, builds with
`SITE_BASE=/stapled-electrician-demo` and deploys to GitHub Pages.

To reproduce that build locally:

```sh
SITE_BASE=/stapled-electrician-demo npm run build
```

Internal links and public files go through `asset()` in `src/data/site.ts`, so
they follow the base.

## Adapting it for a real client

1. `src/data/site.ts`: name, strapline, area and contact details.
2. `src/data/services.ts`: services, what's included, FAQs and quote questions.
3. `src/data/projects.ts`: replace the illustrative jobs with real ones.
4. `src/data/process.ts`: enquiry steps and certificates.
5. `src/data/images.ts`: real site photographs.
6. `src/components/Paperwork.astro`: replace the empty slot with the client's
   real scheme registration and a link to check it. Add reviews only if real.
7. `src/pages/quote.astro`: connect `finish()` to a form service.
8. Remove `DemoBar`, `DemoContact`, the concept page and the `noindex` tag, and
   turn the contact buttons back into `tel:` and `mailto:` links.

## How it's built

- **The live room** (`src/components/Hero.astro`, `src/scripts/room.ts`). Each
  lighting circuit is a separate render. WebGL adds them together in linear
  light, so switches behave like real lamps. The lit poster is the fallback for
  no JavaScript or no WebGL, and portrait screens get their own camera.
- **The three-core line** (`src/scripts/live-line.ts`). An orthogonal route is
  built from `[data-line-node]` anchors, then drawn by measured distance along
  it. Horizontal runs get their own stretch of scrolling and a speed limit, so
  they sweep across at any scroll speed. Images marked `[data-energise]` come on
  when it reaches them. Text is never dimmed. Tuning values are at the top of
  the file.
- **Wall stages** (`src/components/BehindPlaster.astro`). A scale elevation that
  follows the step being read, using IntersectionObserver.
- **Menu** (`src/components/Board.astro`). A consumer unit in a native `<dialog>`.
- **Page transitions**: cross-document View Transitions, where supported. The
  `@view-transition` rule stays inline in `Layout.astro`. In an external
  stylesheet it can load too late, and Chromium then cancels the transition.
- **Service rows** (`src/components/Schedule.astro`). Accordion rows that link
  to the quote form with the service selected (`/quote/?service=<slug>`).
- **Reduced motion**: the opening, scroll scene, wipe and line drawing are
  removed. The line is shown complete and the switches change instantly.

## Regenerating imagery

The kitchen comes from a small path tracer written for this project, in
`scripts/render/`. The consumer unit and test sheet are HTML artwork in
`scripts/art/`, rasterised so their lettering stays sharp. It needs Node and Python with NumPy and Pillow, and raw output
goes to `scripts/render/out/` (ignored by git).

```sh
sh scripts/render/run-final.sh     # kitchen, every circuit, both cameras
python3 scripts/render/bake.py kitchen wide 1600 1000 kitchen-wide dusk=1.7 pendants=1 downlights=0.85 joinery=1
python3 scripts/render/bake.py kitchen tall 864 1400 kitchen-tall dusk=1.7 pendants=1 downlights=0.85 joinery=1
python3 scripts/render/drawn.py    # the "as drawn" image
node scripts/art/rasterise.mjs     # consumer unit and test sheet (needs Playwright)
python3 scripts/fetch-images.py    # licensed photographs
```

The gains in the `bake.py` commands must match `GAIN` in `src/scripts/room.ts`.
Sources and licences are in [IMAGE-CREDITS.md](IMAGE-CREDITS.md).
