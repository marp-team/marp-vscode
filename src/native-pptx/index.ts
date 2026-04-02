import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import { DOM_WALKER_SCRIPT } from './dom-walker-script.generated'
import { buildPptx } from './slide-builder'
import type {
  BgImageData,
  ImageElement,
  SlideData,
  SlideElement,
} from './types'

export interface NativePptxOptions {
  /** Absolute path to the HTML file rendered by Marp CLI. */
  htmlPath: string
  /** Absolute path to a Chromium-based browser executable. */
  browserPath: string
  /** Slide viewport width in pixels (default: 1280). */
  width?: number
  /** Slide viewport height in pixels (default: 720). */
  height?: number
  /** If set, dump extracted SlideData[] JSON to this path for diagnostics. */
  debugJsonPath?: string
}

/**
 * Generate an editable PPTX buffer from a Marp-rendered HTML file.
 *
 * 1. Launch a headless browser via puppeteer-core
 * 2. Load the HTML and wait for rendering
 * 3. Inject the DOM walker script and extract structured slide data
 * 4. Build a PPTX presentation from the extracted data
 * 5. Return the PPTX as a Node.js Buffer
 */
export async function generateNativePptx(
  opts: NativePptxOptions,
): Promise<Buffer> {
  const { htmlPath, browserPath, width = 1280, height = 720 } = opts

  let browser: Browser | undefined

  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width, height })

    // Navigate to the HTML file using a file:// URL so that relative paths
    // (e.g. images referenced as "./image.png") resolve correctly against
    // the directory containing the HTML file.
    const fileUrl = pathToFileURL(htmlPath).href
    await page.goto(fileUrl, { waitUntil: 'networkidle0' })

    // Hide bespoke presentation UI elements so they don't appear in
    // Puppeteer screenshots used for CSS-filtered backgrounds.
    // The OSC overlay sits on top of slides; note panels are off-slide
    // but could affect page layout if not hidden.
    await page.addStyleTag({
      content:
        '.bespoke-marp-osc,[data-bespoke-marp-osc],.bespoke-marp-note{display:none!important}',
    })

    // Inject the DOM walker as a self-contained IIFE script, then call
    // extractSlides() in the browser context.
    //
    // We cannot use page.evaluate(fn) with a direct function reference because
    // webpack's esbuild minimizer (keepNames: true) injects module-scope
    // helpers like `t(fn, name)` into function bodies.  After toString()
    // serialization those references are lost and cause ReferenceError in the
    // browser.  Instead, the DOM walker is compiled separately by esbuild into
    // a standalone IIFE (see scripts/generate-dom-walker-script.js) and
    // embedded as a string constant that is safe to inject via addScriptTag.
    await page.addScriptTag({ content: DOM_WALKER_SCRIPT })
    const slides: SlideData[] = await page.evaluate(() =>
      (globalThis as any).extractSlides(),
    )

    // Rasterize CSS-filtered background images via Puppeteer screenshot.
    // This captures grayscale, brightness, sepia, blur etc. that PptxGenJS
    // cannot reproduce natively.
    await rasterizeSlideTargets(page, buildFilteredBgJobs(slides))
    await rasterizeSlideTargets(page, buildCssFallbackBgJobs(slides))
    await rasterizeSlideTargets(page, buildFilteredContentImageJobs(slides))
    // Rasterize images flagged for screenshot-based capture (e.g. Mermaid SVGs
    // that use <foreignObject> internally and cannot be embedded as-is).
    await rasterizeSlideTargets(page, buildRasterizeImageJobs(slides))
    // Rasterize partial-width background images (e.g. ![bg right:30%]).
    // CSS background-size:cover crops differently than PPTX stretch-to-fill,
    // so we screenshot the rendered figure region for accurate reproduction.
    await rasterizeSlideTargets(page, buildPartialBgJobs(slides))

    // Diagnostic dump: save extracted data as JSON for comparing HTML → JSON → PPTX
    if (opts.debugJsonPath) {
      await writeFile(
        opts.debugJsonPath,
        JSON.stringify(slides, null, 2),
        'utf-8',
      )
    }

    // Build PPTX from extracted data
    const pptx = buildPptx(slides)
    const output = await pptx.write({ outputType: 'nodebuffer' })

    return Buffer.from(output as ArrayBuffer)
  } finally {
    await browser?.close()
  }
}

// ---------------------------------------------------------------------------
// Unified rasterization engine
// ---------------------------------------------------------------------------

/** Timing for page hash-navigation to settle before screenshots. */
const NAVIGATION_SETTLE_MS = 300
/** Timing after all rasterization before returning control. */
const POST_RASTERIZE_SETTLE_MS = 100

interface RasterizeTarget {
  clip: { x: number; y: number; width: number; height: number }
  /**
   * When true, the clip coordinates are slide-relative (x/y measured from
   * the slide section's top-left corner).  rasterizeSlideTargets queries
   * the current section's getBoundingClientRect() AFTER navigating to that
   * slide and adds the origin offset, so bespoke-mode CSS transforms (which
   * move inactive slides off-screen at extraction time) do not corrupt the
   * clip rectangle.
   */
  slideRelative?: boolean
  /** Store the rasterized base64 data-URL into the originating element. */
  onCapture(dataUrl: string): void
}

interface SlideRasterizeJob {
  slideIdx: number
  targets: RasterizeTarget[]
  /** Prepare page visibility before screenshots (e.g. hide overlapping layers). */
  setup?(page: Page, slideIdx: number): Promise<void>
  /** Restore page visibility after screenshots. */
  teardown?(page: Page, slideIdx: number): Promise<void>
}

/**
 * Navigate to each slide, optionally manipulate visibility, then screenshot
 * every target clip region and store the base64 result via onCapture.
 */
async function rasterizeSlideTargets(
  page: Page,
  jobs: SlideRasterizeJob[],
): Promise<void> {
  if (jobs.length === 0) return

  for (const { slideIdx, targets, setup, teardown } of jobs) {
    await page.evaluate((n: number) => {
      window.location.hash = '#' + n
    }, slideIdx + 1)
    await new Promise<void>((r) => setTimeout(r, NAVIGATION_SETTLE_MS))

    // If any target uses slide-relative coordinates, query the current
    // slide section's viewport position AFTER the bespoke transition has
    // settled.  This handles bespoke-mode CSS translateX transforms that
    // move inactive slides off-screen during extraction.
    let slideOriginX = 0
    let slideOriginY = 0
    if (targets.some((t) => t.slideRelative)) {
      const origin = await page.evaluate((n: number) => {
        const sec = Array.from(
          document.querySelectorAll<HTMLElement>('section'),
        ).find((s) => s.getAttribute('data-marpit-pagination') === String(n))
        if (!sec) return { x: 0, y: 0 }
        const r = sec.getBoundingClientRect()
        return { x: r.left, y: r.top }
      }, slideIdx + 1)
      slideOriginX = origin.x
      slideOriginY = origin.y
    }

    try {
      if (setup) await setup(page, slideIdx)
      for (const { clip, slideRelative, onCapture } of targets) {
        const effectiveClip = slideRelative
          ? {
              x: Math.round(slideOriginX + clip.x),
              y: Math.round(slideOriginY + clip.y),
              width: clip.width,
              height: clip.height,
            }
          : clip
        if (effectiveClip.width <= 0 || effectiveClip.height <= 0) continue
        try {
          const raw = await page.screenshot({
            type: 'png',
            clip: effectiveClip,
          })
          onCapture(
            'data:image/png;base64,' + Buffer.from(raw).toString('base64'),
          )
        } catch {
          /* skip — element may be off-screen */
        }
      }
    } finally {
      if (teardown) await teardown(page, slideIdx)
    }
  }

  await page.evaluate(() => {
    window.location.hash = '#1'
  })
  await new Promise<void>((r) => setTimeout(r, POST_RASTERIZE_SETTLE_MS))
}

// ---------------------------------------------------------------------------
// Visibility helpers for rasterization setup/teardown
// ---------------------------------------------------------------------------

const ADVANCED_LAYERS_SELECTOR =
  'section[data-marpit-advanced-background="content"], section[data-marpit-advanced-background="pseudo"]'

async function hideAdvancedLayers(page: Page): Promise<void> {
  await page.evaluate((sel) => {
    document
      .querySelectorAll(sel)
      .forEach((el) =>
        (el as HTMLElement).style.setProperty(
          'visibility',
          'hidden',
          'important',
        ),
      )
  }, ADVANCED_LAYERS_SELECTOR)
}

async function restoreAdvancedLayers(page: Page): Promise<void> {
  await page.evaluate((sel) => {
    document
      .querySelectorAll(sel)
      .forEach((el) => (el as HTMLElement).style.removeProperty('visibility'))
  }, ADVANCED_LAYERS_SELECTOR)
}

async function hideSectionChildren(
  page: Page,
  slideIdx: number,
): Promise<void> {
  await page.evaluate((n: number) => {
    const sec = document.querySelector(`section[data-marpit-pagination="${n}"]`)
    if (!sec) return
    Array.from(sec.children).forEach((el) =>
      (el as HTMLElement).style.setProperty(
        'visibility',
        'hidden',
        'important',
      ),
    )
  }, slideIdx + 1)
}

async function restoreSectionChildren(
  page: Page,
  slideIdx: number,
): Promise<void> {
  await page.evaluate((n: number) => {
    const sec = document.querySelector(`section[data-marpit-pagination="${n}"]`)
    if (!sec) return
    Array.from(sec.children).forEach((el) =>
      (el as HTMLElement).style.removeProperty('visibility'),
    )
  }, slideIdx + 1)
}

// ---------------------------------------------------------------------------
// Job builders: translate SlideData[] into SlideRasterizeJob[]
// ---------------------------------------------------------------------------

function buildFilteredBgJobs(slides: SlideData[]): SlideRasterizeJob[] {
  return slides.flatMap((s, i): SlideRasterizeJob[] => {
    const bgs = (s.backgroundImages ?? []).filter((b) => b.cssFilter)
    if (bgs.length === 0) return []
    return [
      {
        slideIdx: i,
        targets: bgs.map(
          (bg): RasterizeTarget => ({
            clip: {
              x: Math.round(bg.x),
              y: Math.round(bg.y),
              width: Math.round(bg.width),
              height: Math.round(bg.height),
            },
            slideRelative: true,
            onCapture(dataUrl) {
              bg.url = dataUrl
              delete bg.cssFilter
            },
          }),
        ),
        setup: (p) => hideAdvancedLayers(p),
        teardown: (p) => restoreAdvancedLayers(p),
      },
    ]
  })
}

function buildCssFallbackBgJobs(slides: SlideData[]): SlideRasterizeJob[] {
  return slides.flatMap((s, i): SlideRasterizeJob[] => {
    const bgs = (s.backgroundImages ?? []).filter((b) => b.fromCssFallback)
    if (bgs.length === 0) return []
    return [
      {
        slideIdx: i,
        targets: bgs.map(
          (bg): RasterizeTarget => ({
            clip: {
              x: 0,
              y: 0,
              width: Math.round(s.width),
              height: Math.round(s.height),
            },
            slideRelative: true,
            onCapture(dataUrl) {
              bg.url = dataUrl
              delete bg.fromCssFallback
            },
          }),
        ),
        setup: (p, idx) => hideSectionChildren(p, idx),
        teardown: (p, idx) => restoreSectionChildren(p, idx),
      },
    ]
  })
}

function collectFilteredContentImages(
  elements: SlideElement[],
): ImageElement[] {
  const result: ImageElement[] = []
  for (const el of elements ?? []) {
    if (el.type === 'image' && el.cssFilter) result.push(el)
    if ('children' in el && Array.isArray((el as any).children)) {
      result.push(...collectFilteredContentImages((el as any).children))
    }
  }
  return result
}

function buildFilteredContentImageJobs(
  slides: SlideData[],
): SlideRasterizeJob[] {
  return slides.flatMap((s, i): SlideRasterizeJob[] => {
    const imgs = collectFilteredContentImages(s.elements)
    if (imgs.length === 0) return []
    return [
      {
        slideIdx: i,
        targets: imgs.map(
          (img): RasterizeTarget => ({
            clip: {
              x: Math.round(img.x),
              y: Math.round(img.y),
              width: Math.round(img.width),
              height: Math.round(img.height),
            },
            slideRelative: true,
            onCapture(dataUrl) {
              img.src = dataUrl
              delete img.cssFilter
            },
          }),
        ),
      },
    ]
  })
}

function collectRasterizeImages(elements: SlideElement[]): ImageElement[] {
  const result: ImageElement[] = []
  for (const el of elements ?? []) {
    if (el.type === 'image' && el.rasterize) result.push(el)
    if ('children' in el && Array.isArray((el as any).children)) {
      result.push(...collectRasterizeImages((el as any).children))
    }
  }
  return result
}

function buildRasterizeImageJobs(slides: SlideData[]): SlideRasterizeJob[] {
  return slides.flatMap((s, i): SlideRasterizeJob[] => {
    const imgs = collectRasterizeImages(s.elements)
    if (imgs.length === 0) return []
    return [
      {
        slideIdx: i,
        targets: imgs.map(
          (img): RasterizeTarget => ({
            clip: {
              x: Math.round(img.x),
              y: Math.round(img.y),
              width: Math.round(img.width),
              height: Math.round(img.height),
            },
            slideRelative: true,
            onCapture(dataUrl) {
              img.src = dataUrl
              delete img.rasterize
            },
          }),
        ),
      },
    ]
  })
}

/**
 * Rasterize partial-width background images (e.g. `![bg right:30%]`).
 *
 * When Marp uses split backgrounds, the <figure> element uses CSS
 * `background-size: cover` which may crop the image differently than PPTX's
 * default stretch-to-fill.  Screenshotting the rendered figure region gives
 * pixel-accurate reproduction.
 *
 * Only targets backgrounds that are NOT full-slide (partial width/height or
 * offset from origin) and have NOT already been rasterized by other jobs.
 */
function buildPartialBgJobs(slides: SlideData[]): SlideRasterizeJob[] {
  return slides.flatMap((s, i): SlideRasterizeJob[] => {
    const bgs = (s.backgroundImages ?? []).filter((b) => {
      // Skip already-rasterized backgrounds (cssFilter/cssFallback handled above)
      if (b.cssFilter || b.fromCssFallback) return false
      // Skip data: URLs — already embedded or rasterized
      if (b.url.startsWith('data:')) return false
      // Only rasterize partial-width/height backgrounds (split layouts)
      const isFullSlide =
        b.x <= 1 &&
        b.y <= 1 &&
        Math.abs(b.width - s.width) <= 2 &&
        Math.abs(b.height - s.height) <= 2
      return !isFullSlide
    })
    if (bgs.length === 0) return []
    return [
      {
        slideIdx: i,
        targets: bgs.map(
          (bg): RasterizeTarget => ({
            clip: {
              x: Math.round(bg.x),
              y: Math.round(bg.y),
              width: Math.round(bg.width),
              height: Math.round(bg.height),
            },
            slideRelative: true,
            onCapture(dataUrl) {
              bg.url = dataUrl
            },
          }),
        ),
        setup: (p) => hideAdvancedLayers(p),
        teardown: (p) => restoreAdvancedLayers(p),
      },
    ]
  })
}
