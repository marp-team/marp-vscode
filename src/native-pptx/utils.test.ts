import {
  rgbToHex,
  cleanFontFamily,
  pxToInches,
  pxToPoints,
  isTransparent,
  parseCssUrl,
  sanitizeText,
} from './utils'

describe('rgbToHex', () => {
  it('converts rgb(r, g, b) to 6-digit uppercase hex', () => {
    expect(rgbToHex('rgb(255, 0, 0)')).toBe('FF0000')
    expect(rgbToHex('rgb(0, 128, 255)')).toBe('0080FF')
    expect(rgbToHex('rgb(0, 0, 0)')).toBe('000000')
    expect(rgbToHex('rgb(255, 255, 255)')).toBe('FFFFFF')
  })

  it('ignores alpha in rgba(r, g, b, a)', () => {
    expect(rgbToHex('rgba(255, 0, 0, 0.5)')).toBe('FF0000')
    expect(rgbToHex('rgba(0, 0, 0, 0)')).toBe('000000')
  })

  it('returns "000000" for invalid input', () => {
    expect(rgbToHex(undefined)).toBe('000000')
    expect(rgbToHex('')).toBe('000000')
    expect(rgbToHex('invalid')).toBe('000000')
    expect(rgbToHex('transparent')).toBe('000000')
  })

  it('clamps values to 0-255 range', () => {
    expect(rgbToHex('rgb(300, -10, 128)')).toBe('FF0080')
  })
})

describe('cleanFontFamily', () => {
  it('returns first font family without quotes', () => {
    expect(cleanFontFamily('"Noto Sans JP", sans-serif')).toBe('Noto Sans JP')
    expect(cleanFontFamily("'Courier New', monospace")).toBe('Courier New')
    expect(cleanFontFamily('Arial, Helvetica, sans-serif')).toBe('Arial')
  })

  it('maps system fonts to real font names', () => {
    expect(cleanFontFamily('monospace')).toBe('Courier New')
    expect(cleanFontFamily('sans-serif')).toBe('Calibri')
    expect(cleanFontFamily('serif')).toBe('Cambria')
    expect(cleanFontFamily('"Segoe UI", sans-serif')).toBe('Segoe UI')
  })

  it('skips system font aliases and finds the real font', () => {
    expect(cleanFontFamily('-apple-system, "Noto Sans JP", sans-serif')).toBe(
      'Noto Sans JP',
    )
    expect(
      cleanFontFamily(
        '-apple-system, BlinkMacSystemFont, "Meiryo", sans-serif',
      ),
    ).toBe('Meiryo')
  })

  it('falls back to generic family when no real font is found', () => {
    expect(
      cleanFontFamily('-apple-system, BlinkMacSystemFont, sans-serif'),
    ).toBe('Calibri')
  })

  it('prefers Japanese font candidates for CJK text', () => {
    expect(
      cleanFontFamily(
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        '日本語テスト',
      ),
    ).toBe('Noto Sans')
  })

  it('skips proprietary fonts with numeric codes and falls back to Meiryo for CJK text', () => {
    // "UDEV Gothic 35HSJPDOC" is a custom/proprietary font – skip it and fall back to Meiryo
    expect(
      cleanFontFamily(
        '"UDEV Gothic 35HSJPDOC", Meiryo, sans-serif',
        '日本語テスト',
      ),
    ).toBe('Meiryo')
  })

  it('returns Meiryo when no Japanese or standard font is in the stack', () => {
    expect(
      cleanFontFamily(
        '"SomeFont 12ABC", "AnotherFont 99XYZ", sans-serif',
        '日本語テスト',
      ),
    ).toBe('Meiryo')
  })

  it('uses first Windows candidate for Latin text', () => {
    expect(
      cleanFontFamily(
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        'Hello World',
      ),
    ).toBe('Segoe UI')
  })

  it('prefers Consolas in macOS monospace stacks', () => {
    expect(
      cleanFontFamily(
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        'const x = 1',
      ),
    ).toBe('Consolas')
  })

  it('returns "Calibri" for undefined input', () => {
    expect(cleanFontFamily(undefined)).toBe('Calibri')
  })
})

describe('pxToInches', () => {
  it('converts pixels to inches (96px = 1in)', () => {
    expect(pxToInches(96)).toBe(1)
    expect(pxToInches(48)).toBe(0.5)
    expect(pxToInches(0)).toBe(0)
  })
})

describe('pxToPoints', () => {
  it('converts CSS pixels to points (px * 0.75)', () => {
    expect(pxToPoints(16)).toBe(12)
    expect(pxToPoints(24)).toBe(18)
    expect(pxToPoints(0)).toBe(0)
  })
})

describe('isTransparent', () => {
  it('detects transparent colors', () => {
    expect(isTransparent('transparent')).toBe(true)
    expect(isTransparent('rgba(0, 0, 0, 0)')).toBe(true)
    expect(isTransparent('rgba(0, 0, 0, 0.0)')).toBe(true)
    expect(isTransparent('rgba(255, 255, 255, 0)')).toBe(true)
    expect(isTransparent(undefined)).toBe(true)
  })

  it('returns false for semi-transparent colors', () => {
    expect(isTransparent('rgba(0, 0, 0, 0.5)')).toBe(false)
    expect(isTransparent('rgba(255, 255, 255, 0.1)')).toBe(false)
  })

  it('returns false for opaque colors', () => {
    expect(isTransparent('rgb(255, 255, 255)')).toBe(false)
    expect(isTransparent('rgb(0, 0, 0)')).toBe(false)
  })
})

describe('parseCssUrl', () => {
  it('extracts URL from url() value', () => {
    expect(parseCssUrl('url("https://example.com/bg.png")')).toBe(
      'https://example.com/bg.png',
    )
    expect(parseCssUrl("url('file:///C:/images/bg.jpg')")).toBe(
      'file:///C:/images/bg.jpg',
    )
    expect(parseCssUrl('url(data:image/png;base64,abc123)')).toBe(
      'data:image/png;base64,abc123',
    )
  })

  it('handles url() without quotes', () => {
    expect(parseCssUrl('url(https://example.com/bg.png)')).toBe(
      'https://example.com/bg.png',
    )
  })

  it('returns undefined for "none" or empty string', () => {
    expect(parseCssUrl('none')).toBeUndefined()
    expect(parseCssUrl('')).toBeUndefined()
    expect(parseCssUrl(undefined)).toBeUndefined()
  })
})

describe('sanitizeText', () => {
  it('returns normal text unchanged', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World')
    expect(sanitizeText('Mixed \u3042\u30A2 text')).toBe(
      'Mixed \u3042\u30A2 text',
    )
  })

  it('preserves tabs and newlines', () => {
    expect(sanitizeText('line1\nline2')).toBe('line1\nline2')
    expect(sanitizeText('col1\tcol2')).toBe('col1\tcol2')
  })

  it('removes control characters', () => {
    expect(sanitizeText('hello\x00world')).toBe('helloworld')
    expect(sanitizeText('test\x0Bdata')).toBe('testdata')
  })

  it('removes zero-width characters (ZWSP, BOM)', () => {
    expect(sanitizeText('test\u200Bword')).toBe('testword')
    expect(sanitizeText('\uFEFFhello')).toBe('hello')
  })

  it('preserves ZWJ emoji sequences', () => {
    // U+200D (Zero Width Joiner) must NOT be stripped because it composes
    // multi-codepoint emoji (e.g. 🧑\u200D💻 → 🧑‍💻 as a single glyph)
    expect(sanitizeText('\u{1F9D1}\u200D\u{1F4BB}')).toBe(
      '\u{1F9D1}\u200D\u{1F4BB}',
    )
    expect(sanitizeText('Hello \u{1F9D1}\u200D\u{1F4BB} World')).toBe(
      'Hello \u{1F9D1}\u200D\u{1F4BB} World',
    )
  })
})
