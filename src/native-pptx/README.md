# native-pptx — Editable PPTX without LibreOffice

This module generates fully editable PowerPoint files (`.pptx`) from Marp HTML
output using browser-DOM extraction + PptxGenJS, with no dependency on
LibreOffice or any external office converter.

---

## Why this module exists (ADR)

### Background: the limits of existing PPTX export

Before this module, marp-vscode had two PPTX export code paths:

| Mode                       | Mechanism                                                                     | Limitation                                    |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| **Non-editable**           | Marp HTML → Puppeteer → PNG screenshot per slide → pptxgenjs background image | Text is a bitmap — not selectable or editable |
| **Editable (LibreOffice)** | Marp HTML → Puppeteer → PDF → `soffice --headless` PDF import → PPTX          | Requires LibreOffice (experimental)           |

Some context on the history:

- **Native editable PPTX** had been [marked `wontfix`](https://github.com/marp-team/marp-cli/issues/166)
  due to visual fidelity concerns — an image-based approach was considered the
  only practical way to reproduce slide appearance accurately.
- **LibreOffice export** was later added experimentally, since its PDF import
  filter could produce a reasonably editable PPTX. It remains experimental.
- However, **enterprise users who cannot install LibreOffice** still need a way
  to get editable PPTX output. This module addresses that gap.

### Chosen approach: browser-DOM extraction

Rather than parsing the Markdown AST (no theme colour information) or
maintaining a per-theme colour DB (brittle), this module leverages the
Puppeteer browser that is **already running** for the PPTX export pipeline.

After `page.goto()`, `page.evaluate(extractSlides)` runs inside the browser
and collects:

- **`getBoundingClientRect()`** — layout-computed absolute coordinates (px)
- **`getComputedStyle()`** — resolved colour, font, weight, and text alignment
- **`textContent` / text runs** — actual rendered text with inline style spans
- **`<img>.src`** — fully-resolved image URLs including data URIs
- **`<table>` / `<ul>` / `<ol>`** — structured data extraction

The resulting `SlideData[]` is mapped to PptxGenJS API calls by `buildPptx()`
with coordinates converted from px to inches at 96 dpi.

**Key advantage**: theme-agnostic. No matter what CSS the theme uses, the
browser has already computed the final values. Custom HTML (`flex`, `grid`,
`absolute`), scoped styles, and custom themes all work transparently.

### Approaches not taken

All of the following alternatives were considered and rejected:

| Approach                         | Rejected because                                                              |
| -------------------------------- | ----------------------------------------------------------------------------- |
| A: HTML parse + theme colour DB  | Cannot compute `flex`/`grid` layout; DB requires maintenance per theme update |
| B: Markdown AST → pptxgenjs      | No theme colour information in AST; custom HTML blocks are opaque             |
| C: PNG background + text overlay | Same Puppeteer dependency but lower editability                               |
| D: Direct Open XML construction  | Re-implements what PptxGenJS already abstracts                                |
| E: PDF → pptxgenjs               | PDF text extraction quality is poor; no improvement over the LibreOffice path |

---

## Architecture

```
Markdown
  └─ marp-cli (bespoke HTML) ──────────────────────────────────┐
                                                                 │
src/native-pptx/index.ts  ◄── entry point                       │
  1. puppeteer.launch()                                          │
  2. page.goto(bespoke HTML)  ◄──────────────────────────────── ┘
  3. page.addStyleTag()   hide OSC overlay + note panels
  4. page.addScriptTag(DOM_WALKER_SCRIPT)
  5. page.evaluate(extractSlides)  ──►  SlideData[]
  6. rasterizeSlideTargets()       screenshot CSS-filtered images
  7. buildPptx(slides)  ──►  PptxGenJS buffer
  └──► .pptx file
```

### File map

| File                             | Role                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                       | Pipeline orchestration: browser launch → DOM extract → rasterize → build PPTX                                                |
| `dom-walker.ts`                  | `extractSlides()` — runs **in the browser via `page.evaluate()`**; reads DOM, returns `SlideData[]`                          |
| `dom-walker-script.generated.ts` | Compiled IIFE string of `dom-walker.ts` — injected via `addScriptTag` (regenerate with `npm run generate:dom-walker-script`) |
| `slide-builder.ts`               | `buildPptx()` + `placeElement()` — maps `SlideData[]` to PptxGenJS API calls                                                 |
| `types.ts`                       | Shared TypeScript types (`SlideData`, `SlideElement`, `TextRun`, …)                                                          |
| `browser.ts`                     | Chrome/Chromium auto-detection utilities                                                                                     |
| `utils.ts`                       | `pxToInches`, `rgbToHex`, `pxToPoints`, `cleanFontFamily`, `sanitizeText`                                                    |

### Why `dom-walker-script.generated.ts`?

`page.evaluate(fn)` serialises `fn.toString()`. When webpack/esbuild minimises
the bundle it injects module-scope helpers (e.g. `t(fn, name)`) into function
bodies; after serialisation those references are undefined in the browser
context and cause `ReferenceError`.

To avoid this, `dom-walker.ts` is compiled separately by esbuild into a
**standalone IIFE** (`src/native-pptx/scripts/generate-dom-walker-script.js`) and embedded as
a string constant. `page.addScriptTag({ content: DOM_WALKER_SCRIPT })` injects
it safely.

> **Important**: after any change to `dom-walker.ts`, run
> `npm run generate:dom-walker-script` to update the generated file.

---

## Key implementation details

### Presenter notes

marp-cli bespoke HTML injects notes as:

```html
<div class="bespoke-marp-note" data-index="0" tabindex="0">
  <p>Note text</p>
</div>
```

`data-index` is the zero-based slide index. `dom-walker.ts` falls back to this
selector when the raw-Marpit `[data-marpit-presenter-notes]` attribute is absent
(which is always the case for marp-cli bespoke HTML output).

### Background screenshots (CSS filter rasterization)

Slide backgrounds that use CSS filters (`grayscale`, `brightness`, `blur`, etc.)
or complex CSS that pptxgenjs cannot reproduce natively are captured via
Puppeteer screenshot and embedded as images. Three rasterization passes run in
`index.ts`:

1. `buildFilteredBgJobs` — `<figure>` background images with CSS filters
2. `buildCssFallbackBgJobs` — CSS `background-image` set by Marp directives
3. `buildFilteredContentImageJobs` — inline `<img>` with CSS filters

Before screenshots are taken, the bespoke **OSC overlay**
(`<div class="bespoke-marp-osc">`) and note panels (`.bespoke-marp-note`) are
hidden via `page.addStyleTag()` so they do not appear in the output.

### Mermaid diagrams

Mermaid renders as `<svg>` inside a `<pre>` code fence. These SVGs contain
`<foreignObject>` elements for text labels, which most PPTX viewers cannot
render from SVG data. The dom-walker sets `rasterize: true` on such elements;
`buildFlaggedScreenshotJobs` in `index.ts` captures them as PNGs.

### Text height clamping

Font rendering differences between Chromium and PowerPoint can cause text
elements near the bottom of a slide to have a computed height that extends
beyond the slide boundary. `placeElement()` in `slide-builder.ts` clamps the
height of all text-type elements so `y + h ≤ slideH`. Images are **not**
clamped — overflow is intentional for split-layout backgrounds.

### Heading border-left text offset

When a heading has `border-left` (common in themes as a vertical accent bar),
`slide-builder.ts` draws the colour rectangle **before** the text box and shifts
the text box right by the border width (`x + bw`, `w - bw`). This mirrors the
same pattern used for `<blockquote>`, ensuring the decorative bar is _behind_
the text in the PPTX z-order and that text does not visually overlap the bar.

### ZWJ emoji sequence preservation

`sanitizeText` strips control and zero-width characters to prevent PptxGenJS
from emitting corrupt XML. **U+200D (Zero Width Joiner) is intentionally
preserved** because it is load-bearing for multi-codepoint emoji compositions
(e.g. `U+1F9D1 U+200D U+1F4BB` → 🧑‍💻). Stripping it would split the sequence
into two separate glyphs (🧑 + 💻).

### Leading-badge heading offset (`computeLeadingOffset`)

Inline badge shapes (`.step`, `.badge-current`, etc.) are extracted as separate
PptxGenJS shapes. When a badge sits at the _left edge_ of a heading or paragraph
box ("leading badge"), the text box is shifted right by the badge's width so
that text does not render on top of the shape. `computeLeadingOffset` computes
this offset by finding badge shapes whose `x` is within 8px of the container's
left edge.

---

## Supported elements

| Element                               | Fidelity | Notes                                         |
| ------------------------------------- | -------- | --------------------------------------------- |
| Slide background (solid colour)       | ◎        | Extracted via `getComputedStyle`              |
| Slide background (image / CSS filter) | ◎        | Rasterized by Puppeteer                       |
| Heading H1–H6                         | ◎        | Inline run styling, border-bottom/left        |
| Paragraph                             | ◎        | Multiple runs with bold/italic/underline/link |
| Bulleted / numbered list              | ◎        | Nested lists, tight-list emoji bullets        |
| Table                                 | ◎        | Per-cell style, colour, alignment             |
| Code block                            | ○        | Syntax-highlighted runs preserved             |
| Image (URL / data URI / file://)      | ◎        | Natural size with aspect ratio                |
| Mermaid diagram (SVG)                 | ◎        | Rasterized to PNG                             |
| Blockquote                            | ○        | Left border bar + text                        |
| Header / Footer                       | ◎        | Absolute coordinate placement                 |
| Presenter notes                       | ◎        | Both raw-Marpit and bespoke-HTML formats      |
| CSS gradient background               | △        | Simplified to solid colour                    |
| CSS `transform` / `clip-path`         | △        | Ignored; elements placed at rect coordinates  |

---

## Running the visual diff improvement loop

This workflow compares rendered HTML slides against PPTX output to identify
remaining fidelity gaps.

### Canonical test deck

`src/native-pptx/test-fixtures/pptx-export.md` is the primary edge-case reference for
this module. It contains 59 slides covering every known rendering challenge:

- Basic headings, paragraphs, lists, tables, code blocks
- `border-bottom` on H1 and `border-left` vertical bar on H2/H3
- Inline badge shapes (pill, circle, status chips, step numbers)
- Leading-badge heading offset (`computeLeadingOffset`)
- ZWJ emoji sequences (🧑‍💻, 👨‍👩‍👧‍👦 — multi-codepoint single glyph)
- `strong { background-color: ... }` solid colour highlight
- CSS `section::before/after` banner suppression
- Complex background filters (`blur`, `brightness`, `grayscale`)
- Split-layout (`flex`, `grid`, HTML `<div>`) with images

Use this file as the input when running the visual diff loop below. The
file lives inside the repository so any contributor can reproduce results.

### Prerequisites

1. Install dependencies: `npm install`
2. Build the native-pptx bundle: `npm run build:native-pptx`
3. Have Chrome/Chromium available (auto-detected via `@puppeteer/browsers`)
4. Install LibreOffice for PPTX → PNG rendering, **or** use PowerPoint COM
   automation on Windows

### Steps

```sh
# 1. Convert the canonical test deck to bespoke HTML
npx marp src/native-pptx/test-fixtures/pptx-export.md --html --output /tmp/pptx-export.html

# 2. Generate native PPTX from the HTML
node src/native-pptx/tools/gen-pptx.js /tmp/pptx-export.html /tmp/pptx-export.pptx

# 3. Compare HTML slides vs PPTX slides side-by-side
#    (requires LibreOffice or PowerPoint COM for PPTX screenshots)
node src/native-pptx/tools/compare-visuals.js /tmp/pptx-export.html /tmp/pptx-export.pptx

# Output in /tmp/compare-pptx-export/:
#   html-slide-000.png   — Marp HTML reference screenshot
#   pptx-slide-000.png   — PPTX slide screenshot
#   compare-000.png      — side-by-side diff image
#   compare-report.html  — per-slide diff area summary
```

### Debug mode

Set `MARP_PPTX_DEBUG=1` before running `gen-pptx.js` to dump a
`*.native-pptx.json` file alongside the output, containing the full
`SlideData[]` extracted from the DOM:

```sh
MARP_PPTX_DEBUG=1 node src/native-pptx/tools/gen-pptx.js docs/example.html
```

### AI-assisted improvement loop

1. Run `compare-visuals.js` and review `compare-report.html`.
2. Open a high-diff slide pair (`html-slide-NNN.png` + `pptx-slide-NNN.png`).
3. Describe the visual delta to an AI agent with access to this codebase.
4. The agent locates the responsible code in `dom-walker.ts` or
   `slide-builder.ts`, proposes a fix, and updates the unit tests.
5. If `dom-walker.ts` changed, regenerate `dom-walker-script.generated.ts`.
6. Re-run `gen-pptx.js` + `compare-visuals.js` to verify the improvement.

Repeat until all slides in `compare-report.html` show acceptable diff scores.

---

## Running tests

```sh
# Unit tests only (fast — no browser required)
npx jest "native-pptx"

# Full test suite
npx jest
```

### Test file overview

| Test file               | What it covers                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.test.ts`         | Pipeline orchestration: browser lifecycle, CSS injection, script injection, evaluate call, buffer return                                       |
| `dom-walker.test.ts`    | `extractSlides()`: slides from SVG/inline HTML, backgrounds, element classification, tables, lists, presenter notes (both formats)             |
| `slide-builder.test.ts` | `buildPptx()` / `placeElement()`: heading/paragraph/list/table/code/image/blockquote placement, text-height clamping, image overflow exemption |
| `browser.test.ts`       | `findChrome()`: platform detection, path resolution                                                                                            |
| `utils.test.ts`         | `pxToInches`, `rgbToHex`, `pxToPoints`, `cleanFontFamily`, `sanitizeText`                                                                      |

---

## Known limitations

- **CSS gradients**: pptxgenjs gradient API differs from CSS; gradients are
  simplified to a solid colour.
- **CSS `transform`**: rotated/scaled elements are placed at their unrotated
  bounding-box coordinates.
- **`clip-path`**: ignored; elements appear at full size.
- **Text overflow at runtime**: text that exceeds a box inside PowerPoint is
  hidden by PPTX's own clipping. Only the height measured at extraction time
  is clamped.
- **Web fonts**: PowerPoint falls back to an installed font when the web font
  is not embedded. `cleanFontFamily()` strips CSS font-stack fallbacks and
  keeps only the primary family name.
- **Dark mode / forced-colors**: screenshots are taken in light mode.
