export function rgbToHex(rgb: string | undefined): string {
  if (!rgb) return '000000'

  const match = rgb.match(
    /rgba?\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*(?:,\s*[\d.]+\s*)?\)/,
  )
  if (!match) return '000000'

  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)

  return [r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

// Generic CSS font families and system aliases → PowerPoint fallback
const genericFontMap: Record<string, string> = {
  'sans-serif': 'Calibri',
  'serif': 'Cambria',
  'monospace': 'Courier New',
  'cursive': 'Calibri',
  'fantasy': 'Calibri',
  'ui-sans-serif': 'Calibri',
  'ui-serif': 'Cambria',
  'ui-monospace': 'Courier New',
}

// System font aliases that are not real installable fonts
const systemAliases = new Set([
  '-apple-system',
  'blinkmacsystemfont',
  'system-ui',
  'ui-rounded',
  'ui-monospace',
])

// Mac-only or mac-first fonts that frequently appear in Chromium stacks but
// are not good choices for a Windows PowerPoint output.
const macOnlyFonts = new Set([
  'sfmono-regular',
  'sf mono',
  'menlo',
  'sf pro text',
  'sf pro display',
])

// System fonts that DO exist in PowerPoint
const knownSystemFonts: Record<string, string> = {
  'segoe ui': 'Segoe UI',
  'helvetica neue': 'Arial',
  'helvetica': 'Arial',
}

const japaneseFontPattern =
  /(noto sans jp|noto sans cjk jp|noto sans|yu gothic ui|yu gothic|meiryo|biz udpgothic|biz udgothic|ms pgothic|ms gothic|hiragino sans)/i

const japaneseTextPattern = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/

export function cleanFontFamily(
  css: string | undefined,
  sampleText?: string,
): string {
  if (!css) return 'Calibri'

  const families = css.split(',')
  let fallback: string | undefined
  const candidates: string[] = []
  const hasJapaneseText =
    typeof sampleText === 'string' && japaneseTextPattern.test(sampleText)

  for (const raw of families) {
    const name = raw.trim().replace(/^["']|["']$/g, '')
    if (!name) continue

    const lower = name.toLowerCase()

    if (systemAliases.has(lower)) continue

    if (macOnlyFonts.has(lower)) continue

    const known = knownSystemFonts[lower]
    if (known) {
      candidates.push(known)
      continue
    }

    const generic = genericFontMap[lower]
    if (generic) {
      if (!fallback) fallback = generic
      continue
    }

    candidates.push(name)
  }

  if (hasJapaneseText) {
    const japaneseCandidate = candidates.find((candidate) =>
      japaneseFontPattern.test(candidate),
    )

    if (japaneseCandidate) return japaneseCandidate

    // No Japanese-capable font found in the stack.
    // Fall through to the first non-proprietary candidate or
    // a generic Japanese fallback rather than returning a font
    // that is almost certainly not installed (e.g. UDEV Gothic 35HSJPDOC).
    const nonProprietary = candidates.find(
      (c) => !/\b\d{2,4}[A-Z]{2,}/i.test(c), // skip names with numeric+suffix codes like "35HSJPDOC"
    )
    if (nonProprietary) return nonProprietary

    // Last resort for Japanese: Meiryo is pre-installed on modern Windows
    return 'Meiryo'
  }

  if (candidates.length > 0) {
    return candidates[0]
  }

  return fallback ?? 'Calibri'
}

/** Convert px to PowerPoint inches (1 inch = 96 CSS px at standard DPI). */
export function pxToInches(px: number): number {
  return px / 96
}

/** Convert CSS px to PowerPoint points (1 pt = 1.333... px). */
export function pxToPoints(px: number): number {
  return px * 0.75
}

/** Returns true if the color string represents a transparent or near-transparent color. */
export function isTransparent(color: string | undefined): boolean {
  if (!color) return true
  if (color === 'transparent') return true
  // Match rgba with alpha ≤ 0.01
  const match = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/)
  if (match) return parseFloat(match[1]) <= 0.01
  return false
}

/** Extract the first URL from a CSS `url(...)` value. Returns undefined if none found. */
export function parseCssUrl(value: string | undefined): string | undefined {
  if (!value || value === 'none') return undefined
  const match = value.match(/url\(["']?([^"')]+)["']?\)/)
  return match?.[1]
}

/**
 * Remove control characters and other problematic sequences that cause
 * pptxgenjs to emit "???" or corrupt the XML output.
 */
export function sanitizeText(text: string): string {
  // Remove C0 control chars (except \t \n \r) and C1 control chars
  // Also remove zero-width spaces, BOM, and other invisible chars.
  // NOTE: U+200D (Zero Width Joiner) is intentionally preserved because it composes
  // multi-codepoint emoji sequences (e.g. 🧑\u200D💻 → 🧑‍💻). Stripping it splits
  // the sequence into two separate glyphs in the PPTX output.
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFEFF\u200B\u200C\u2060]/g, '')
}
