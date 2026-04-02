import { fileURLToPath } from 'node:url'
import PptxGenJS from 'pptxgenjs'
import type {
  SlideData,
  SlideElement,
  TextRun,
  ListItem,
  TextStyle,
} from './types'
import {
  rgbToHex,
  cleanFontFamily,
  pxToInches,
  pxToPoints,
  isTransparent,
  sanitizeText,
} from './utils'

/** Resolve a URL (data:, file:, or http) into PptxGenJS image source props. */
function resolveImageSource(url: string): { data?: string; path?: string } {
  if (url.startsWith('data:')) return { data: url }
  if (url.startsWith('file:')) return { path: fileURLToPath(url) }
  return { path: url }
}

/**
 * Convert CSS line-height and font-size into a PPTX lineSpacingMultiple value.
 *
 * Both values are in px (from getComputedStyle).  Returns undefined when the
 * ratio is outside a sensible range so PptxGenJS uses its own default.
 */
function computeLineSpacing(style: TextStyle): number | undefined {
  const { lineHeight, fontSize } = style
  if (!lineHeight || !fontSize || lineHeight <= 0 || fontSize <= 0)
    return undefined
  const m = lineHeight / fontSize
  if (m < 0.5 || m > 4) return undefined
  return Math.round(m * 100) / 100
}

/**
 * Convert CSS letter-spacing (px) into a PptxGenJS charSpacing value (points).
 * Returns undefined when the value is negligible.
 */
function computeCharSpacing(style: TextStyle): number | undefined {
  const ls = style.letterSpacing
  if (!ls || Math.abs(ls) < 0.1) return undefined
  return Math.round(pxToPoints(ls) * 100) / 100
}

/**
 * Convert CSS padding values (px) into a PptxGenJS margin (inset) tuple.
 * Returns 0 (no inset) when the style has no padding fields.
 * The margin array is [top, right, bottom, left] in points.
 */
function computeTextInset(
  style: TextStyle,
): [number, number, number, number] | 0 {
  const pt = (style.paddingTop ?? 0) * 0.75
  const pr = (style.paddingRight ?? 0) * 0.75
  const pb = (style.paddingBottom ?? 0) * 0.75
  const pl = (style.paddingLeft ?? 0) * 0.75
  return pt || pr || pb || pl ? [pt, pr, pb, pl] : 0
}

/**
 * Build a PptxGenJS presentation from structured slide data extracted by the
 * DOM walker.
 */
export function buildPptx(slides: SlideData[]): PptxGenJS {
  const pptx = new PptxGenJS()

  const slideW = slides[0]?.width ?? 1280
  const slideH = slides[0]?.height ?? 720

  pptx.defineLayout({
    name: 'MARP',
    width: pxToInches(slideW),
    height: pxToInches(slideH),
  })
  pptx.layout = 'MARP'

  for (const slideData of slides) {
    const slide = pptx.addSlide()

    // Slide background color (used when no full-slide background image exists)
    const bgColor = isTransparent(slideData.background)
      ? 'FFFFFF'
      : rgbToHex(slideData.background)

    const bgImages = slideData.backgroundImages ?? []

    // Determine if the first background image is a full-slide cover without a
    // CSS filter — if so, use it as the PPTX slide background property (which
    // is the proper way to set a slide background in OOXML and gives the best
    // editing experience in PowerPoint).
    const firstBg = bgImages[0]
    const isFullSlide =
      firstBg &&
      !firstBg.cssFilter &&
      firstBg.x <= 1 &&
      firstBg.y <= 1 &&
      Math.abs(firstBg.width - slideData.width) <= 2 &&
      Math.abs(firstBg.height - slideData.height) <= 2

    if (isFullSlide && bgImages.length === 1) {
      // Single full-slide background without filter → use slide.background
      slide.background = resolveImageSource(firstBg.url)
    } else {
      // Multiple backgrounds or partial/filtered backgrounds → solid fill +
      // overlay each background image as a positioned shape.
      slide.background = { fill: bgColor }

      for (const bg of bgImages) {
        const x = pxToInches(bg.x)
        const y = pxToInches(bg.y)
        const w = pxToInches(bg.width)
        const h = pxToInches(bg.height)
        const imgOpts: PptxGenJS.ImageProps = {
          x,
          y,
          w,
          h,
          ...resolveImageSource(bg.url),
        }
        slide.addImage(imgOpts)
      }
    }

    // Place elements at absolute coordinates
    for (const el of slideData.elements) {
      placeElement(slide, el, slideData.width, slideData.height)
    }

    // Presenter notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes)
    }
  }

  return pptx
}

// Text element types whose height should be clamped to slide bounds.
// Font rendering differences between browser and PPTX can cause text
// boxes near the slide bottom to extend beyond the visible area.
// Images and containers are intentionally excluded — overflow can be
// valid (e.g. bleed images, split-layout backgrounds).
const TEXT_ELEMENT_TYPES = new Set([
  'heading',
  'paragraph',
  'list',
  'blockquote',
  'code',
  'table',
  'header',
  'footer',
])

export function placeElement(
  slide: PptxGenJS.Slide,
  el: SlideElement,
  slideW = 0,
  slideH = 0,
): void {
  const x = pxToInches(el.x)
  const y = pxToInches(el.y)
  const w = pxToInches(el.width)
  const rawH = pxToInches(el.height)
  // Clamp height for text elements so they never extend beyond the slide area.
  const h =
    slideH > 0 && TEXT_ELEMENT_TYPES.has(el.type)
      ? Math.min(rawH, Math.max(0.01, pxToInches(slideH) - y))
      : rawH

  switch (el.type) {
    case 'heading': {
      // Draw border-left bar FIRST (z-order: behind text)
      const headingBorderW =
        el.borderLeft && el.borderLeft.width > 0
          ? pxToInches(el.borderLeft.width)
          : 0
      if (headingBorderW > 0) {
        slide.addShape('rect', {
          x,
          y,
          w: headingBorderW,
          h,
          fill: { color: rgbToHex(el.borderLeft!.color) },
          line: { color: rgbToHex(el.borderLeft!.color) },
        })
      }
      // Draw text shifted right so it doesn't overlap the border-left bar
      slide.addText(
        el.runs.map((r) => toTextProps(r)),
        {
          x: x + headingBorderW,
          y,
          w: Math.max(0.01, w - headingBorderW),
          h,
          margin: 0,
          valign: 'top',
          align: el.style.textAlign as PptxGenJS.HAlign,
          lineSpacingMultiple: computeLineSpacing(el.style),
          paraSpaceBefore: 0,
          charSpacing: computeCharSpacing(el.style),
        },
      )
      // Draw border-bottom as a thin filled rectangle directly below the heading
      if (el.borderBottom && el.borderBottom.width > 0) {
        const bh = pxToInches(el.borderBottom.width)
        slide.addShape('rect', {
          x,
          y: y + h,
          w,
          h: bh,
          fill: { color: rgbToHex(el.borderBottom.color) },
          line: { color: rgbToHex(el.borderBottom.color) },
        })
      }
      break
    }

    case 'paragraph':
      slide.addText(
        el.runs.map((r) => toTextProps(r)),
        {
          x,
          y,
          w,
          h,
          margin: computeTextInset(el.style),
          valign: el.valign ?? 'top',
          align: el.style.textAlign as PptxGenJS.HAlign,
          lineSpacingMultiple: computeLineSpacing(el.style),
          paraSpaceBefore: 0,
          charSpacing: computeCharSpacing(el.style),
        },
      )
      break

    case 'header':
    case 'footer':
      slide.addText(
        el.runs.map((r) => toTextProps(r)),
        {
          x,
          y,
          w,
          h,
          margin: 0,
          valign: 'top',
          align: el.style.textAlign as PptxGenJS.HAlign,
          lineSpacingMultiple: computeLineSpacing(el.style),
          paraSpaceBefore: 0,
          charSpacing: computeCharSpacing(el.style),
        },
      )
      break

    case 'blockquote':
      if (el.borderLeft && el.borderLeft.width > 0) {
        const bw = pxToInches(el.borderLeft.width)
        slide.addShape('rect', {
          x,
          y,
          w: bw,
          h,
          fill: { color: rgbToHex(el.borderLeft.color) },
        })
        slide.addText(
          el.runs.map((r) => toTextProps(r)),
          {
            x: x + bw,
            y,
            w: w - bw,
            h,
            margin: 0,
            valign: 'top',
            align: el.style.textAlign as PptxGenJS.HAlign,
            lineSpacingMultiple: computeLineSpacing(el.style),
            paraSpaceBefore: 0,
            charSpacing: computeCharSpacing(el.style),
          },
        )
      } else {
        slide.addText(
          el.runs.map((r) => toTextProps(r)),
          {
            x,
            y,
            w,
            h,
            margin: 0,
            valign: 'top',
            align: el.style.textAlign as PptxGenJS.HAlign,
            lineSpacingMultiple: computeLineSpacing(el.style),
            paraSpaceBefore: 0,
            charSpacing: computeCharSpacing(el.style),
          },
        )
      }
      break

    case 'list':
      slide.addText(
        el.items.flatMap((item, index) =>
          toListTextProps(item, el.ordered, index < el.items.length - 1),
        ),
        {
          x,
          y,
          w,
          h,
          margin: 0,
          valign: 'top',
          align: el.style.textAlign as PptxGenJS.HAlign,
          lineSpacingMultiple: computeLineSpacing(el.style),
          paraSpaceBefore: 0,
          charSpacing: computeCharSpacing(el.style),
        },
      )
      break

    case 'table':
      slide.addTable(
        el.rows.map((row) =>
          row.cells.map((cell) => {
            // Use styled runs if available, otherwise plain text
            if (cell.runs && cell.runs.length > 0) {
              const cellOpts: Record<string, any> = {
                align: cell.style.textAlign as PptxGenJS.HAlign,
              }
              if (!isTransparent(cell.style.backgroundColor)) {
                cellOpts.fill = { color: rgbToHex(cell.style.backgroundColor) }
              }
              if (
                cell.style.borderColor &&
                !isTransparent(cell.style.borderColor)
              ) {
                cellOpts.border = {
                  pt: 1,
                  color: rgbToHex(cell.style.borderColor),
                }
              }
              return {
                text: cell.runs.map((r) => ({
                  text: sanitizeText(r.text),
                  options: {
                    color: rgbToHex(r.color),
                    fontSize: pxToPoints(r.fontSize ?? cell.style.fontSize),
                    fontFace: cleanFontFamily(
                      r.fontFamily ?? cell.style.fontFamily,
                      r.text,
                    ),
                    bold:
                      r.bold ?? cell.isHeader ?? cell.style.fontWeight >= 600,
                    italic: r.italic,
                  },
                })),
                options: cellOpts,
              }
            }
            // Fallback: plain text
            const cellOpts: Record<string, any> = {
              bold: cell.isHeader || cell.style.fontWeight >= 600,
              color: rgbToHex(cell.style.color),
              fontSize: pxToPoints(cell.style.fontSize),
              fontFace: cleanFontFamily(cell.style.fontFamily, cell.text),
              align: cell.style.textAlign as PptxGenJS.HAlign,
            }
            if (!isTransparent(cell.style.backgroundColor)) {
              cellOpts.fill = { color: rgbToHex(cell.style.backgroundColor) }
            }
            if (
              cell.style.borderColor &&
              !isTransparent(cell.style.borderColor)
            ) {
              cellOpts.border = {
                pt: 1,
                color: rgbToHex(cell.style.borderColor),
              }
            }
            return { text: sanitizeText(cell.text), options: cellOpts }
          }),
        ),
        {
          x,
          y,
          w,
          autoPage: false,
          // Preserve HTML column proportions when per-column widths are available
          ...(el.colWidths &&
          el.colWidths.length > 0 &&
          el.colWidths.every((cw) => cw > 0)
            ? {
                colW: el.colWidths.map((cw) => pxToInches(cw)),
              }
            : {}),
        },
      )
      break

    case 'code': {
      // Background rectangle for code blocks
      if (!isTransparent(el.style.backgroundColor)) {
        slide.addShape('rect', {
          x,
          y,
          w,
          h,
          fill: { color: rgbToHex(el.style.backgroundColor) },
        })
      }
      // Code blocks: always use el.text (raw textContent) as the source of truth
      // for line structure. Syntax-highlighted el.runs skips whitespace-only text
      // nodes (blank lines between code sections), so blank lines would be lost
      // when runs are used. Plain monospace text preserves all newlines correctly.
      slide.addText(sanitizeText(el.text), {
        x,
        y,
        w,
        h,
        margin: 0,
        fontFace: 'Courier New',
        fontSize: pxToPoints(el.style.fontSize),
        color: rgbToHex(el.style.color),
        valign: 'top',
        paraSpaceBefore: 0,
      })
      break
    }

    case 'image': {
      const imgOpts: PptxGenJS.ImageProps = {
        x,
        y,
        w,
        h,
        ...resolveImageSource(el.src),
      }
      slide.addImage(imgOpts)
      break
    }

    case 'container': {
      const bg = el.style?.backgroundColor
      const borderWidth = el.style?.borderWidth ?? 0
      const borderColor = el.style?.borderColor
      const borderRadius = el.style?.borderRadius ?? 0
      const borderLeft = el.style?.borderLeft
      const hasBoxShadow = el.style?.boxShadow === true
      const hasBackground = !isTransparent(bg)
      const hasBorder =
        borderWidth > 0 && !!borderColor && !isTransparent(borderColor)

      // Determine effective line (border) for the shape.
      // box-shadow → thin grey line to simulate card elevation.
      const lineStyle: Record<string, any> | undefined = hasBorder
        ? { color: rgbToHex(borderColor!), width: pxToPoints(borderWidth) }
        : hasBoxShadow
          ? { color: 'CCCCCC', width: 0.5 }
          : undefined

      if (hasBackground || hasBorder || hasBoxShadow) {
        // Use 'roundRect' shape type when border-radius is set
        const shapeType = borderRadius > 0 ? 'roundRect' : 'rect'
        // rectRadius is 0-1: convert px radius relative to the smaller dimension
        const minDim = Math.min(el.width, el.height)
        const rectRadius =
          borderRadius > 0
            ? Math.min(0.5, borderRadius / (minDim / 2))
            : undefined
        slide.addShape(shapeType as PptxGenJS.ShapeType, {
          x,
          y,
          w,
          h,
          fill: hasBackground ? { color: rgbToHex(bg!) } : { type: 'none' },
          ...(lineStyle ? { line: lineStyle } : {}),
          ...(rectRadius !== undefined ? { rectRadius } : {}),
        })
      }
      // Draw border-left bar (e.g. note-box left accent bar)
      if (borderLeft && borderLeft.width > 0) {
        const bw = pxToInches(borderLeft.width)
        slide.addShape('rect', {
          x,
          y,
          w: bw,
          h,
          fill: { color: rgbToHex(borderLeft.color) },
          line: { color: rgbToHex(borderLeft.color) },
        })
      }
      // Badge/chip text: render runs centered inside the shape.
      // extractInlineBadgeShapes captures badge text directly so it aligns
      // perfectly with the badge background shape, avoiding the misalignment
      // that occurs when text is placed from the parent paragraph's text flow.
      if (
        el.runs &&
        el.runs.length > 0 &&
        el.runs.some((r) => !r.breakLine && r.text.trim() !== '')
      ) {
        slide.addText(
          el.runs.map((r) => toTextProps(r)),
          {
            x,
            y,
            w,
            h,
            margin: 0,
            valign: 'middle',
            align: 'center',
            lineSpacingMultiple: 1,
            paraSpaceBefore: 0,
          },
        )
      }
      // Recursively place children.
      // When the container has a visible background, strip redundant highlight
      // from children's text runs whose backgroundColor matches the container
      // fill.  The shape already provides the visual background; keeping the
      // same colour as a text highlight causes visible artefacts (colour bleed
      // on slight positioning mismatches).
      if (hasBackground) {
        const bgHex = rgbToHex(bg!)
        for (const child of el.children ?? []) {
          if ('runs' in child && Array.isArray((child as any).runs)) {
            for (const r of (child as any).runs as TextRun[]) {
              if (
                !r.breakLine &&
                r.backgroundColor &&
                rgbToHex(r.backgroundColor) === bgHex
              ) {
                r.backgroundColor = undefined
              }
            }
          }
        }
      }
      for (const child of el.children ?? []) {
        placeElement(slide, child, slideW, slideH)
      }
      break
    }
  }
}

export function toTextProps(run: TextRun): PptxGenJS.TextProps {
  // Explicit break run (inserted by extractTextRuns for block boundaries / <br>)
  if (run.breakLine) {
    return { text: '', options: { breakLine: true } }
  }

  const text = sanitizeText(run.text)

  // Derive highlight color from backgroundColor when present.
  // PptxGenJS accepts a 6-digit hex string for highlight.
  const highlight: string | undefined = run.backgroundColor
    ? rgbToHex(run.backgroundColor)
    : undefined

  return {
    text,
    options: {
      color: rgbToHex(run.color),
      fontSize: pxToPoints(run.fontSize ?? 16),
      fontFace: cleanFontFamily(run.fontFamily, run.text),
      bold: run.bold,
      italic: run.italic,
      underline: run.underline ? { style: 'sng' } : undefined,
      strike: run.strikethrough ? 'sngStrike' : undefined,
      hyperlink: run.hyperlink ? { url: run.hyperlink } : undefined,
      highlight,
    },
  }
}

export function toListTextProps(
  item: ListItem,
  ordered = false,
  breakAfter = false,
): PptxGenJS.TextProps[] {
  const bulletOption: boolean | Record<string, any> = ordered
    ? { type: 'number', style: 'arabicPeriod' }
    : true

  if (item.runs.length === 0) {
    return [
      {
        text: sanitizeText(item.text) || ' ',
        options: {
          bullet: bulletOption,
          indentLevel: item.level,
          breakLine: breakAfter,
        },
      },
    ]
  }

  return item.runs.map((run, i) => ({
    text: sanitizeText(run.text),
    options: {
      ...(i === 0 ? { bullet: bulletOption, indentLevel: item.level } : {}),
      ...(i === item.runs.length - 1 && breakAfter ? { breakLine: true } : {}),
      color: rgbToHex(run.color),
      fontSize: pxToPoints(run.fontSize ?? 16),
      fontFace: cleanFontFamily(run.fontFamily, run.text),
      bold: run.bold,
      italic: run.italic,
    },
  }))
}
