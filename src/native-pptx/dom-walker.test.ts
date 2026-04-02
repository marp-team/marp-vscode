// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { JSDOM } = require('jsdom')
import { extractSlides } from './dom-walker'

// ---------------------------------------------------------------------------
// Manual JSDOM setup (jest-environment-jsdom hangs with jest 30 + node 22)
// ---------------------------------------------------------------------------

let dom: InstanceType<typeof JSDOM>

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')

  // Expose browser globals that dom-walker.ts relies on
  ;(globalThis as any).document = dom.window.document
  ;(globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(
    dom.window,
  )
  ;(globalThis as any).Node = dom.window.Node
  ;(globalThis as any).NodeFilter = dom.window.NodeFilter
  ;(globalThis as any).XMLSerializer = dom.window.XMLSerializer
})

afterEach(() => {
  delete (globalThis as any).document
  delete (globalThis as any).getComputedStyle
  delete (globalThis as any).Node
  delete (globalThis as any).NodeFilter
  delete (globalThis as any).XMLSerializer
  dom.window.close()
})

// ---------------------------------------------------------------------------
// Mock helpers (jsdom does not compute layout)
// ---------------------------------------------------------------------------

function mockRect(
  el: Element,
  rect: { left: number; top: number; width: number; height: number },
) {
  ;(el as any).getBoundingClientRect = () => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON() {},
  })
}

const defaultStyles: Record<string, string> = {
  display: 'block',
  visibility: 'visible',
  color: 'rgb(0, 0, 0)',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  fontSize: '16px',
  fontFamily: 'Arial',
  fontWeight: '400',
  fontStyle: 'normal',
  textAlign: 'left',
  textDecorationLine: 'none',
  lineHeight: '24px',
  borderColor: 'rgb(0, 0, 0)',
}

/**
 * Patch `getComputedStyle` so that it returns mocked style objects for the
 * specified elements. Other elements fall through to the original implementation.
 */
function mockStyles(
  mappings: Array<[Element, Record<string, string>]>,
): () => void {
  const original = globalThis.getComputedStyle
  const map = new Map<Element, CSSStyleDeclaration>()

  for (const [el, styles] of mappings) {
    const merged = { ...defaultStyles, ...styles }
    const proxy = new Proxy({} as CSSStyleDeclaration, {
      get(_t, prop: string) {
        if (prop === 'getPropertyValue')
          return (name: string) => merged[name] ?? ''
        return merged[prop] ?? ''
      },
    })
    map.set(el, proxy)
  }

  ;(globalThis as any).getComputedStyle = (target: Element) => {
    return map.get(target) ?? original(target)
  }

  return () => {
    ;(globalThis as any).getComputedStyle = original
  }
}

/**
 * Set up a single-slide HTML document and mock the section element.
 */
function setupSlide(
  bodyContent: string,
  sectionRect = { left: 0, top: 0, width: 1280, height: 720 },
) {
  document.body.innerHTML = `
    <section data-marpit-pagination="1">${bodyContent}</section>
  `
  const section = document.querySelector('section')!
  mockRect(section, sectionRect)
  return { section }
}

// -----------------------------------------------------------------------
// extractSlides — basic
// -----------------------------------------------------------------------

describe('extractSlides', () => {
  it('returns empty array for empty document', () => {
    expect(extractSlides()).toEqual([])
  })

  it('extracts top-level section as slide even without pagination', () => {
    document.body.innerHTML = `
      <div id=":$p">
        <svg data-marpit-svg="" viewBox="0 0 1280 720">
          <foreignObject width="1280" height="720">
            <section id="1" data-theme="default" lang="ja-JP">
              <h1>Title</h1>
            </section>
          </foreignObject>
        </svg>
      </div>
    `

    const section = document.querySelector('section')!
    const h1 = section.querySelector('h1')!

    mockRect(section, { left: 0, top: 0, width: 1280, height: 720 })
    mockRect(h1, { left: 70, top: 80, width: 1140, height: 60 })

    const restore = mockStyles([
      [
        section,
        { backgroundColor: 'rgb(255, 255, 255)', backgroundImage: 'none' },
      ],
      [h1, { fontSize: '40px', fontWeight: '700', color: 'rgb(34, 68, 102)' }],
    ])

    const slides = extractSlides()
    expect(slides).toHaveLength(1)
    expect(slides[0].elements).toHaveLength(1)
    expect(slides[0].elements[0].type).toBe('heading')

    restore()
  })

  it('extracts section[data-marpit-pagination] as one slide', () => {
    const { section } = setupSlide('<h1>Title</h1>')
    const h1 = section.querySelector('h1')!

    mockRect(h1, { left: 70, top: 80, width: 1140, height: 60 })

    const restore = mockStyles([
      [
        section,
        { backgroundColor: 'rgb(255, 255, 255)', backgroundImage: 'none' },
      ],
      [h1, { fontSize: '40px', fontWeight: '700', color: 'rgb(34, 68, 102)' }],
    ])

    const slides = extractSlides()
    expect(slides).toHaveLength(1)
    expect(slides[0].width).toBe(1280)
    expect(slides[0].height).toBe(720)
    expect(slides[0].background).toBe('rgb(255, 255, 255)')
    expect(slides[0].elements).toHaveLength(1)
    expect(slides[0].elements[0].type).toBe('heading')

    restore()
  })

  it('extracts presenter notes', () => {
    const { section } = setupSlide(
      '<div data-marpit-presenter-notes>Speaker notes here</div>',
    )

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255, 255, 255)' }],
    ])

    const slides = extractSlides()
    expect(slides[0].notes).toBe('Speaker notes here')

    restore()
  })

  it('extracts presenter notes from bespoke HTML format (.bespoke-marp-note)', () => {
    // marp-cli bespoke output does NOT put notes in [data-marpit-presenter-notes].
    // Instead it injects <div class="bespoke-marp-note" data-index="N"> elements
    // as siblings to the slide section.
    const { section } = setupSlide('')
    const noteEl = document.createElement('div')
    noteEl.className = 'bespoke-marp-note'
    noteEl.setAttribute('data-index', '0')
    noteEl.innerHTML = '<p>Bespoke note line 1</p><p>line 2</p>'
    document.body.appendChild(noteEl)

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255, 255, 255)' }],
    ])

    const slides = extractSlides()
    expect(slides[0].notes).toBe('Bespoke note line 1line 2')

    restore()
  })
})

// -----------------------------------------------------------------------
// walkElements — tested through extractSlides
// -----------------------------------------------------------------------

describe('walkElements (via extractSlides)', () => {
  it('classifies heading elements as heading', () => {
    const { section } = setupSlide('<h1>Title</h1>')
    const h1 = section.querySelector('h1')!

    mockRect(h1, { left: 10, top: 20, width: 500, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [h1, { fontSize: '32px', fontWeight: '700', color: 'rgb(0, 0, 0)' }],
    ])

    const slides = extractSlides()
    const elements = slides[0].elements
    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({
      type: 'heading',
      level: 1,
      x: 10,
      y: 20,
      width: 500,
      height: 40,
    })

    restore()
  })

  it('classifies paragraph elements as paragraph', () => {
    const { section } = setupSlide('<p>Hello world</p>')
    const p = section.querySelector('p')!

    mockRect(p, { left: 10, top: 50, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, { color: 'rgb(51, 51, 51)' }],
    ])

    const slides = extractSlides()
    expect(slides[0].elements).toHaveLength(1)
    expect(slides[0].elements[0].type).toBe('paragraph')

    restore()
  })

  it('classifies list elements as list', () => {
    const { section } = setupSlide('<ul><li>Item 1</li><li>Item 2</li></ul>')
    const ul = section.querySelector('ul')!
    const lis = section.querySelectorAll('li')

    mockRect(ul, { left: 10, top: 100, width: 600, height: 48 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [ul, {}],
      [lis[0], {}],
      [lis[1], {}],
    ])

    const slides = extractSlides()
    expect(slides[0].elements).toHaveLength(1)
    expect(slides[0].elements[0]).toMatchObject({
      type: 'list',
      ordered: false,
    })

    const listEl = slides[0].elements[0] as any
    expect(listEl.items).toHaveLength(2)

    restore()
  })

  it('skips hidden elements', () => {
    const { section } = setupSlide(
      '<p id="visible">Visible</p><p id="hidden">Hidden</p>',
    )
    const visible = document.getElementById('visible')!
    const hidden = document.getElementById('hidden')!

    mockRect(visible, { left: 0, top: 0, width: 600, height: 24 })
    mockRect(hidden, { left: 0, top: 30, width: 600, height: 24 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [visible, {}],
      [hidden, { display: 'none' }],
    ])

    const slides = extractSlides()
    expect(slides[0].elements).toHaveLength(1)

    restore()
  })

  it('skips zero-size elements', () => {
    const { section } = setupSlide('<p>Empty</p>')
    const p = section.querySelector('p')!

    mockRect(p, { left: 0, top: 0, width: 0, height: 0 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, {}],
    ])

    const slides = extractSlides()
    expect(slides[0].elements).toHaveLength(0)

    restore()
  })

  it('recursively expands div containers', () => {
    const { section } = setupSlide(
      '<div id="container"><p>Nested paragraph</p></div>',
    )
    const container = document.getElementById('container')!
    const p = container.querySelector('p')!

    mockRect(container, { left: 0, top: 0, width: 640, height: 200 })
    mockRect(p, { left: 10, top: 10, width: 620, height: 24 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [container, { backgroundColor: 'rgb(200, 200, 200)' }],
      [p, {}],
    ])

    const slides = extractSlides()
    expect(slides[0].elements).toHaveLength(1)
    expect(slides[0].elements[0]).toMatchObject({ type: 'container' })
    expect((slides[0].elements[0] as any).children).toHaveLength(1)
    expect((slides[0].elements[0] as any).children[0].type).toBe('paragraph')

    restore()
  })

  it('computes slide-relative coordinates', () => {
    const { section } = setupSlide('<h2>Sub</h2>', {
      left: 100,
      top: 200,
      width: 1280,
      height: 720,
    })
    const h2 = section.querySelector('h2')!

    mockRect(h2, { left: 170, top: 280, width: 500, height: 36 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [h2, { fontSize: '28px', fontWeight: '700' }],
    ])

    const slides = extractSlides()
    expect(slides[0].elements[0]).toMatchObject({ x: 70, y: 80 })

    restore()
  })
})

// -----------------------------------------------------------------------
// extractTextRuns — tested through extractSlides
// -----------------------------------------------------------------------

describe('extractTextRuns (via extractSlides)', () => {
  it('extracts plain text runs', () => {
    const { section } = setupSlide('<p id="t">Hello world</p>')
    const p = document.getElementById('t')!

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        p,
        {
          color: 'rgb(0, 0, 0)',
          fontSize: '16px',
          fontWeight: '400',
          fontStyle: 'normal',
          textDecorationLine: 'none',
        },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.runs).toHaveLength(1)
    expect(el.runs[0].text).toBe('Hello world')
    expect(el.runs[0].bold).toBe(false)

    restore()
  })

  it('parses bold and italic inline elements', () => {
    const { section } = setupSlide(
      '<p id="t">Normal <strong>Bold</strong> <em>Italic</em></p>',
    )
    const p = document.getElementById('t')!
    const strong = p.querySelector('strong')!
    const em = p.querySelector('em')!

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, { fontWeight: '400', fontStyle: 'normal' }],
      [strong, { fontWeight: '700', fontStyle: 'normal' }],
      [em, { fontWeight: '400', fontStyle: 'italic' }],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any

    const boldRun = el.runs.find((r: any) => r.text === 'Bold')
    expect(boldRun?.bold).toBe(true)

    const italicRun = el.runs.find((r: any) => r.text === 'Italic')
    expect(italicRun?.italic).toBe(true)

    restore()
  })

  it('records hyperlink href', () => {
    const { section } = setupSlide(
      '<p id="t"><a href="https://example.com">Link</a></p>',
    )
    const p = document.getElementById('t')!
    const a = p.querySelector('a')!

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, {}],
      [a, {}],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.runs).toHaveLength(1)
    expect(el.runs[0].text).toBe('Link')
    expect(el.runs[0].hyperlink).toContain('example.com')

    restore()
  })

  it('converts <br> to breakLine:true run', () => {
    const { section } = setupSlide('<p id="t">Line1<br>Line2</p>')
    const p = document.getElementById('t')!

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, {}],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    // breakLine run should exist between Line1 and Line2
    const breakRun = el.runs.find((r: any) => r.breakLine === true)
    expect(breakRun).toBeDefined()
    expect(breakRun.text).toBe('')
    // Text runs should not contain literal '\n'
    const textRuns = el.runs.filter((r: any) => !r.breakLine)
    expect(textRuns.map((r: any) => r.text)).toEqual(['Line1', 'Line2'])

    restore()
  })
})

// -----------------------------------------------------------------------
// extractTextStyle — tested through extractSlides
// -----------------------------------------------------------------------

describe('extractTextStyle (via extractSlides)', () => {
  it('extracts CSS text style properties', () => {
    const { section } = setupSlide('<h1>Styled</h1>')
    const h1 = section.querySelector('h1')!

    mockRect(h1, { left: 0, top: 0, width: 600, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        h1,
        {
          color: 'rgb(34, 68, 102)',
          fontSize: '24px',
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: '700',
          textAlign: 'center',
          lineHeight: '36px',
        },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.style).toEqual({
      color: 'rgb(34, 68, 102)',
      fontSize: 24,
      fontFamily: '"Noto Sans JP", sans-serif',
      fontWeight: 700,
      textAlign: 'center',
      lineHeight: 36,
      letterSpacing: 0,
    })

    restore()
  })
})

// -----------------------------------------------------------------------
// extractListItems — tested through extractSlides
// -----------------------------------------------------------------------

describe('extractListItems (via extractSlides)', () => {
  it('extracts flat list items', () => {
    const { section } = setupSlide(
      '<ul id="list"><li>Item A</li><li>Item B</li></ul>',
    )
    const ul = document.getElementById('list')!
    const lis = ul.querySelectorAll('li')

    mockRect(ul, { left: 0, top: 0, width: 600, height: 48 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [ul, {}],
      [lis[0], {}],
      [lis[1], {}],
    ])

    const slides = extractSlides()
    const listEl = slides[0].elements[0] as any
    expect(listEl.items).toHaveLength(2)
    expect(listEl.items[0]).toMatchObject({ text: 'Item A', level: 0 })
    expect(listEl.items[1]).toMatchObject({ text: 'Item B', level: 0 })

    restore()
  })

  it('correctly records nested list levels', () => {
    const { section } = setupSlide(`
      <ul id="list">
        <li>Top
          <ul>
            <li>Nested</li>
          </ul>
        </li>
      </ul>
    `)
    const list = document.getElementById('list')!
    const allLis = list.querySelectorAll('li')

    mockRect(list, { left: 0, top: 0, width: 600, height: 72 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [list, {}],
      ...Array.from(allLis).map(
        (li) => [li, {}] as [Element, Record<string, string>],
      ),
    ])

    const slides = extractSlides()
    const listEl = slides[0].elements[0] as any
    expect(listEl.items.some((i: any) => i.level === 0)).toBe(true)
    expect(listEl.items.some((i: any) => i.level === 1)).toBe(true)

    restore()
  })

  it('preserves inline element order within list items', () => {
    const { section } = setupSlide(
      '<ul id="list"><li>Normal <strong>Bold</strong> more</li></ul>',
    )
    const list = document.getElementById('list')!
    const li = list.querySelector('li')!
    const strong = li.querySelector('strong')!

    mockRect(list, { left: 0, top: 0, width: 600, height: 48 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [list, {}],
      [li, { fontWeight: '400' }],
      [strong, { fontWeight: '700' }],
    ])

    const slides = extractSlides()
    const listEl = slides[0].elements[0] as any
    expect(listEl.items).toHaveLength(1)

    // Runs should be in document order: "Normal ", "Bold", " more"
    const texts = listEl.items[0].runs.map((r: any) => r.text)
    expect(texts[0]).toContain('Normal')
    expect(texts[1]).toBe('Bold')
    expect(texts[2]).toContain('more')

    // Bold run should have bold=true
    const boldRun = listEl.items[0].runs.find((r: any) => r.text === 'Bold')
    expect(boldRun.bold).toBe(true)

    restore()
  })

  it('correctly extracts li > p structured list items', () => {
    const { section } = setupSlide(
      '<ul id="list"><li><p>Paragraph in list</p></li></ul>',
    )
    const list = document.getElementById('list')!
    const li = list.querySelector('li')!
    const p = li.querySelector('p')!

    mockRect(list, { left: 0, top: 0, width: 600, height: 48 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [list, {}],
      [li, {}],
      [p, {}],
    ])

    const slides = extractSlides()
    const listEl = slides[0].elements[0] as any
    expect(listEl.items).toHaveLength(1)
    expect(listEl.items[0].runs.length).toBeGreaterThan(0)
    expect(listEl.items[0].runs[0].text).toBe('Paragraph in list')

    restore()
  })
})

// -----------------------------------------------------------------------
// extractTableData — tested through extractSlides
// -----------------------------------------------------------------------

describe('extractTableData (via extractSlides)', () => {
  it('extracts table rows and cells', () => {
    const { section } = setupSlide(`
      <table id="tbl">
        <tr><th>Header</th></tr>
        <tr><td>Cell</td></tr>
      </table>
    `)
    const table = document.getElementById('tbl')!
    const cells = table.querySelectorAll('th, td')

    mockRect(table, { left: 0, top: 0, width: 600, height: 80 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [table, {}],
      ...Array.from(cells).map(
        (c) => [c, {}] as [Element, Record<string, string>],
      ),
    ])

    const slides = extractSlides()
    const tableEl = slides[0].elements[0] as any
    expect(tableEl.rows).toHaveLength(2)
    expect(tableEl.rows[0].cells[0].isHeader).toBe(true)
    expect(tableEl.rows[0].cells[0].text).toBe('Header')
    expect(tableEl.rows[1].cells[0].isHeader).toBe(false)
    expect(tableEl.rows[1].cells[0].text).toBe('Cell')

    restore()
  })

  it('extracts inline decorations in table cells as runs', () => {
    const { section } = setupSlide(`
      <table id="tbl">
        <tr><td>Normal <strong>Bold</strong></td></tr>
      </table>
    `)
    const table = document.getElementById('tbl')!
    const td = table.querySelector('td')!
    const strong = td.querySelector('strong')!

    mockRect(table, { left: 0, top: 0, width: 600, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [table, {}],
      [td, { fontWeight: '400' }],
      [strong, { fontWeight: '700' }],
    ])

    const slides = extractSlides()
    const tableEl = slides[0].elements[0] as any
    const cell = tableEl.rows[0].cells[0]
    expect(cell.runs.length).toBeGreaterThan(0)

    const boldRun = cell.runs.find((r: any) => r.text === 'Bold')
    expect(boldRun?.bold).toBe(true)

    restore()
  })

  it('extracts table cell fontFamily', () => {
    const { section } = setupSlide(`
      <table id="tbl">
        <tr><td>Text</td></tr>
      </table>
    `)
    const table = document.getElementById('tbl')!
    const td = table.querySelector('td')!

    mockRect(table, { left: 0, top: 0, width: 600, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [table, {}],
      [td, { fontFamily: '"Noto Sans JP", sans-serif' }],
    ])

    const slides = extractSlides()
    const tableEl = slides[0].elements[0] as any
    expect(tableEl.rows[0].cells[0].style.fontFamily).toBe(
      '"Noto Sans JP", sans-serif',
    )

    restore()
  })

  it('extracts first-row cell widths as colWidths', () => {
    const { section } = setupSlide(`
      <table id="tbl">
        <tr><th id="c1">A</th><th id="c2">B</th></tr>
        <tr><td>1</td><td>2</td></tr>
      </table>
    `)
    const table = document.getElementById('tbl')!
    const c1 = document.getElementById('c1')!
    const c2 = document.getElementById('c2')!

    // mock offsetWidth
    Object.defineProperty(c1, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(c2, 'offsetWidth', { value: 400, configurable: true })

    mockRect(table, { left: 0, top: 0, width: 600, height: 60 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [table, {}],
      [c1, {}],
      [c2, {}],
      ...Array.from(table.querySelectorAll('td')).map(
        (c) => [c, {}] as [Element, Record<string, string>],
      ),
    ])

    const slides = extractSlides()
    const tableEl = slides[0].elements[0] as any
    expect(tableEl.colWidths).toEqual([200, 400])

    restore()
  })
})

// -----------------------------------------------------------------------
// Marp Inline SVG mode — section deduplication
// -----------------------------------------------------------------------

describe('Marp Inline SVG mode section deduplication', () => {
  it('merges 3-layer sections into 1 slide when ![bg] is used', () => {
    // Simulate Marp's 3-layer structure for a slide with ![bg]
    document.body.innerHTML = `
      <section data-marpit-pagination="1" data-marpit-advanced-background="background">
        <div data-marpit-advanced-background-container>
          <figure id="bg-figure"></figure>
        </div>
      </section>
      <section data-marpit-pagination="1" data-marpit-advanced-background="content">
        <h1>Title</h1>
      </section>
      <section data-marpit-pagination="1" data-marpit-advanced-background="pseudo">
      </section>
    `
    const sections = document.querySelectorAll('section')
    const h1 = document.querySelector('h1')!
    const figure = document.getElementById('bg-figure')!
    const bgContainer = document.querySelector(
      '[data-marpit-advanced-background-container]',
    )!

    for (const s of Array.from(sections)) {
      mockRect(s, { left: 0, top: 0, width: 1280, height: 720 })
    }
    mockRect(h1, { left: 10, top: 20, width: 500, height: 40 })

    const originalCS = globalThis.getComputedStyle
    const styleMap = new Map<Element, Record<string, string>>()
    for (const s of Array.from(sections)) {
      styleMap.set(s, {
        ...defaultStyles,
        backgroundColor: 'rgb(255,255,255)',
        backgroundImage: 'none',
      })
    }
    styleMap.set(h1, { ...defaultStyles, fontSize: '32px', fontWeight: '700' })
    styleMap.set(figure, {
      ...defaultStyles,
      backgroundImage: 'url("bg-image.png")',
      filter: 'none',
    })
    styleMap.set(bgContainer, { ...defaultStyles })
    ;(globalThis as any).getComputedStyle = (target: Element) => {
      const styles = styleMap.get(target) ?? defaultStyles
      return new Proxy({} as CSSStyleDeclaration, {
        get(_t, prop: string) {
          if (prop === 'getPropertyValue')
            return (name: string) => styles[name] ?? ''
          return styles[prop] ?? ''
        },
      })
    }

    const slides = extractSlides()

    // Should produce exactly 1 slide, not 3
    expect(slides).toHaveLength(1)
    expect(slides[0].elements.some((e: any) => e.type === 'heading')).toBe(true)
    // Background image should be extracted from the figure as BgImageData[]
    expect(slides[0].backgroundImages).toHaveLength(1)
    expect(slides[0].backgroundImages[0].url).toBe('bg-image.png')
    ;(globalThis as any).getComputedStyle = originalCS
  })

  it('keeps 1 section = 1 slide without ![bg]', () => {
    const { section } = setupSlide('<p>Text</p>')
    const p = section.querySelector('p')!
    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, {}],
    ])

    const slides = extractSlides()
    expect(slides).toHaveLength(1)

    restore()
  })
})

// -----------------------------------------------------------------------
// findBackgroundColor — tested through extractSlides
// -----------------------------------------------------------------------

describe('findBackgroundColor (via extractSlides)', () => {
  it('falls back to white when section is transparent', () => {
    const { section } = setupSlide('<p>Text</p>')
    const p = section.querySelector('p')!
    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })

    const restore = mockStyles([
      [
        section,
        { backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none' },
      ],
      [p, {}],
    ])

    const slides = extractSlides()
    expect(slides[0].background).toBe('rgb(255, 255, 255)')

    restore()
  })

  it('uses section background color as-is', () => {
    const { section } = setupSlide('<p>Text</p>')
    const p = section.querySelector('p')!
    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(30, 60, 90)' }],
      [p, {}],
    ])

    const slides = extractSlides()
    expect(slides[0].background).toBe('rgb(30, 60, 90)')

    restore()
  })

  it('extracts last opaque color from gradient background', () => {
    const { section } = setupSlide('<p>Text</p>')
    const p = section.querySelector('p')!
    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })

    const restore = mockStyles([
      [
        section,
        {
          backgroundColor: 'rgba(0, 0, 0, 0)',
          backgroundImage:
            'linear-gradient(135deg, rgba(15, 108, 189, 0.09), rgba(15, 108, 189, 0) 45%), linear-gradient(rgb(245, 251, 255) 0%, rgb(255, 255, 255) 75%)',
        },
      ],
      [p, {}],
    ])

    const slides = extractSlides()
    // Should extract the last rgb from the gradient: rgb(255, 255, 255)
    expect(slides[0].background).toBe('rgb(255, 255, 255)')

    restore()
  })

  it('gets correct color from section gradient even with black body', () => {
    const { section } = setupSlide('<p>Text</p>')
    const p = section.querySelector('p')!
    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })

    // Mock body with black background (just like Marp HTML)
    const originalBodyGetCS = globalThis.getComputedStyle
    const bodyProxy = new Proxy({} as CSSStyleDeclaration, {
      get(_t, prop: string) {
        if (prop === 'backgroundColor') return 'rgb(0, 0, 0)'
        return ''
      },
    })

    const sectionStyles = {
      ...defaultStyles,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      backgroundImage:
        'linear-gradient(rgb(245, 251, 255) 0%, rgb(255, 255, 255) 75%)',
    }
    const sectionProxy = new Proxy({} as CSSStyleDeclaration, {
      get(_t, prop: string) {
        if (prop === 'getPropertyValue')
          return (name: string) => sectionStyles[name] ?? ''
        return sectionStyles[prop] ?? ''
      },
    })

    const pStyles = { ...defaultStyles }
    const pProxy = new Proxy({} as CSSStyleDeclaration, {
      get(_t, prop: string) {
        if (prop === 'getPropertyValue')
          return (name: string) => pStyles[name] ?? ''
        return pStyles[prop] ?? ''
      },
    })

    const map = new Map<Element, CSSStyleDeclaration>()
    map.set(section, sectionProxy)
    map.set(p, pProxy)
    ;(globalThis as any).getComputedStyle = (target: Element) => {
      if (target === document.body) return bodyProxy
      return map.get(target) ?? originalBodyGetCS(target)
    }

    const slides = extractSlides()
    // Should NOT pick up body's black background
    expect(slides[0].background).not.toBe('rgb(0, 0, 0)')
    expect(slides[0].background).toBe('rgb(255, 255, 255)')
    ;(globalThis as any).getComputedStyle = originalBodyGetCS
  })
})

// -----------------------------------------------------------------------
// blockquote border extraction
// -----------------------------------------------------------------------

describe('blockquote border (via extractSlides)', () => {
  it('extracts left border width and color', () => {
    const { section } = setupSlide('<blockquote>Quote text</blockquote>')
    const bq = section.querySelector('blockquote')!

    mockRect(bq, { left: 10, top: 50, width: 600, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [bq, { borderLeftWidth: '4px', borderLeftColor: 'rgb(100, 100, 100)' }],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.type).toBe('blockquote')
    expect(el.borderLeft).toEqual({ width: 4, color: 'rgb(100, 100, 100)' })

    restore()
  })

  it('omits borderLeft when no left border exists', () => {
    const { section } = setupSlide('<blockquote>Quote text</blockquote>')
    const bq = section.querySelector('blockquote')!

    mockRect(bq, { left: 10, top: 50, width: 600, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [bq, { borderLeftWidth: '0px' }],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.borderLeft).toBeUndefined()

    restore()
  })

  it('inserts breakLine run between multiple <p> elements in blockquote', () => {
    const { section } = setupSlide(
      '<blockquote id="bq"><p>First</p><p>Second</p></blockquote>',
    )
    const bq = document.getElementById('bq')!
    const paras = bq.querySelectorAll('p')

    mockRect(bq, { left: 10, top: 50, width: 600, height: 80 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [bq, { borderLeftWidth: '4px', borderLeftColor: 'rgb(50,50,50)' }],
      [paras[0], { display: 'block' }],
      [paras[1], { display: 'block' }],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    // Expect: [run'First', breakLine, run'Second'] (no trailing break)
    const texts = el.runs.map((r: any) => (r.breakLine ? '\n' : r.text))
    expect(texts).toEqual(['First', '\n', 'Second'])

    restore()
  })
})

// -----------------------------------------------------------------------
// code syntax highlighting
// -----------------------------------------------------------------------

describe('code syntax highlighting (via extractSlides)', () => {
  it('extracts colored runs from span elements inside pre > code', () => {
    const { section } = setupSlide(
      '<pre id="codeblock"><code><span class="keyword">const</span> x = 1;</code></pre>',
    )
    const pre = document.getElementById('codeblock')!
    const code = pre.querySelector('code')!
    const span = code.querySelector('span')!

    mockRect(pre, { left: 10, top: 100, width: 600, height: 80 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [pre, { backgroundColor: 'rgb(40, 44, 52)', fontSize: '14px' }],
      [code, { color: 'rgb(200, 200, 200)', fontSize: '14px' }],
      [
        span,
        { color: 'rgb(198, 120, 221)', fontSize: '14px', fontWeight: '700' },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.type).toBe('code')
    expect(el.runs.length).toBeGreaterThan(0)

    const keywordRun = el.runs.find((r: any) => r.text === 'const')
    expect(keywordRun).toBeDefined()
    expect(keywordRun.color).toBe('rgb(198, 120, 221)')
    expect(keywordRun.bold).toBe(true)

    restore()
  })
})

// -----------------------------------------------------------------------
// extractTextRuns — background-color (mark / strong / span)
// -----------------------------------------------------------------------

describe('extractTextRuns — backgroundColor (via extractSlides)', () => {
  it('propagates <mark> background-color to TextRun', () => {
    const { section } = setupSlide(
      '<p id="t">Normal <mark>Highlighted</mark> text</p>',
    )
    const p = document.getElementById('t')!
    const mark = p.querySelector('mark')!

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, { display: 'block' }],
      [mark, { display: 'inline', backgroundColor: 'rgb(241, 196, 15)' }],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    const hlRun = el.runs.find((r: any) => r.text === 'Highlighted')
    expect(hlRun).toBeDefined()
    expect(hlRun.backgroundColor).toBe('rgb(241, 196, 15)')

    restore()
  })

  it('inline elements without background-color have no backgroundColor', () => {
    const { section } = setupSlide('<p id="t">Normal <em>Italic</em> text</p>')
    const p = document.getElementById('t')!
    const em = p.querySelector('em')!

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, { display: 'block' }],
      [
        em,
        {
          display: 'inline',
          fontStyle: 'italic',
          backgroundColor: 'rgba(0, 0, 0, 0)',
        },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    const italicRun = el.runs.find((r: any) => r.text === 'Italic')
    expect(italicRun).toBeDefined()
    expect(italicRun.backgroundColor).toBeUndefined()

    restore()
  })

  it('preserves independent backgroundColor for multiple <mark> elements', () => {
    const { section } = setupSlide(
      '<p id="t"><mark>A</mark> and <mark>B</mark></p>',
    )
    const p = document.getElementById('t')!
    const marks = p.querySelectorAll('mark')

    mockRect(p, { left: 0, top: 0, width: 600, height: 24 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [p, { display: 'block' }],
      [marks[0], { display: 'inline', backgroundColor: 'rgb(241, 196, 15)' }],
      [marks[1], { display: 'inline', backgroundColor: 'rgb(52, 152, 219)' }],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    const runA = el.runs.find((r: any) => r.text === 'A')
    const runB = el.runs.find((r: any) => r.text === 'B')
    expect(runA?.backgroundColor).toBe('rgb(241, 196, 15)')
    expect(runB?.backgroundColor).toBe('rgb(52, 152, 219)')

    restore()
  })
})

// -----------------------------------------------------------------------
// heading border extraction
// -----------------------------------------------------------------------

describe('heading border extraction (via extractSlides)', () => {
  it('extracts h1 border-bottom as borderBottom', () => {
    const { section } = setupSlide('<h1>Title</h1>')
    const h1 = section.querySelector('h1')!

    mockRect(h1, { left: 0, top: 0, width: 600, height: 50 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        h1,
        {
          fontSize: '40px',
          fontWeight: '700',
          borderBottomWidth: '2px',
          borderBottomColor: 'rgb(39, 174, 96)',
          borderLeftWidth: '0px',
        },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.type).toBe('heading')
    expect(el.borderBottom).toEqual({ width: 2, color: 'rgb(39, 174, 96)' })
    expect(el.borderLeft).toBeUndefined()

    restore()
  })

  it('extracts h2 border-left as borderLeft', () => {
    const { section } = setupSlide('<h2>Section</h2>')
    const h2 = section.querySelector('h2')!

    mockRect(h2, { left: 0, top: 0, width: 600, height: 40 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        h2,
        {
          fontSize: '30px',
          fontWeight: '700',
          borderLeftWidth: '4px',
          borderLeftColor: 'rgb(39, 174, 96)',
          borderBottomWidth: '0px',
        },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.type).toBe('heading')
    expect(el.borderLeft).toEqual({ width: 4, color: 'rgb(39, 174, 96)' })
    expect(el.borderBottom).toBeUndefined()

    restore()
  })

  it('omits border properties when both border-bottom and border-left are 0', () => {
    const { section } = setupSlide('<h1>Plain</h1>')
    const h1 = section.querySelector('h1')!

    mockRect(h1, { left: 0, top: 0, width: 600, height: 50 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        h1,
        {
          fontSize: '40px',
          fontWeight: '700',
          borderBottomWidth: '0px',
          borderLeftWidth: '0px',
        },
      ],
    ])

    const slides = extractSlides()
    const el = slides[0].elements[0] as any
    expect(el.borderBottom).toBeUndefined()
    expect(el.borderLeft).toBeUndefined()

    restore()
  })
})

// -----------------------------------------------------------------------
// SVG embedding
// -----------------------------------------------------------------------

describe('SVG element extraction (via extractSlides)', () => {
  it('extracts <svg> inside slide as image element', () => {
    const { section } = setupSlide(
      '<svg width="200" height="100" viewBox="0 0 200 100"><rect x="10" y="10" width="80" height="60" fill="blue"/></svg>',
    )
    const svg = section.querySelector('svg')!

    mockRect(svg, { left: 10, top: 20, width: 200, height: 100 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [svg, { display: 'inline', visibility: 'visible' }],
    ])

    ;(svg as any).getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
      right: 210,
      bottom: 120,
    })

    const slides = extractSlides()
    const svgEl = slides[0].elements.find((e: any) => e.type === 'image') as any
    expect(svgEl).toBeDefined()
    // SVG is base64-encoded for PptxGenJS/Office compatibility
    expect(svgEl.src).toMatch(/^data:image\/svg\+xml;base64,/)

    restore()
  })
})

// -----------------------------------------------------------------------
// Inline children inside flex parent
// -----------------------------------------------------------------------

describe('preserving display:inline children in flex container (via extractSlides)', () => {
  it('extracts display:inline text span inside display:flex parent as paragraph', () => {
    const { section } = setupSlide(`
      <div id="flex-row">
        <span id="badge" style="border-radius:50%;">1</span>
        <span id="label">Text Label</span>
      </div>
    `)
    const flexDiv = section.querySelector('#flex-row')!
    const badge = section.querySelector('#badge')!
    const label = section.querySelector('#label')!

    mockRect(flexDiv, { left: 0, top: 10, width: 600, height: 40 })
    mockRect(badge, { left: 0, top: 14, width: 32, height: 32 })
    mockRect(label, { left: 42, top: 18, width: 200, height: 24 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [flexDiv, { display: 'flex', alignItems: 'center' }],
      [
        badge,
        {
          display: 'inline',
          backgroundColor: 'rgb(0, 102, 204)',
          color: 'rgb(255,255,255)',
          borderRadius: '50%',
          fontSize: '14px',
          fontFamily: 'Arial',
          fontWeight: '700',
          textAlign: 'left',
          lineHeight: '14px',
        },
      ],
      [
        label,
        {
          display: 'inline',
          color: 'rgb(0,0,0)',
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          textAlign: 'left',
          lineHeight: '24px',
          backgroundColor: 'rgba(0,0,0,0)',
        },
      ],
    ])

    const slides = extractSlides()
    const container = slides[0].elements.find(
      (e: any) => e.type === 'container',
    ) as any
    expect(container).toBeDefined()

    // Verify label span is also included as a paragraph in children
    const allElements = container?.children ?? slides[0].elements
    const paragraphs = allElements.filter((e: any) => e.type === 'paragraph')
    const labelParagraph = paragraphs.find((e: any) =>
      e.runs?.some((r: any) => r.text === 'Text Label'),
    )
    expect(labelParagraph).toBeDefined()

    restore()
  })

  it('display:inline-flex badge span has paragraph with valign:middle', () => {
    const { section } = setupSlide('<span id="badge">1</span>')
    const badge = section.querySelector('#badge')!

    mockRect(badge, { left: 10, top: 10, width: 32, height: 32 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        badge,
        {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(0, 102, 204)',
          color: 'rgb(255,255,255)',
          borderRadius: '16px',
          fontSize: '14px',
          fontFamily: 'Arial',
          fontWeight: '700',
          textAlign: 'left',
          lineHeight: '14px',
        },
      ],
    ])

    const slides = extractSlides()
    const para = slides[0].elements.find(
      (e: any) => e.type === 'paragraph',
    ) as any
    expect(para).toBeDefined()
    expect(para.valign).toBe('middle')

    restore()
  })
})

// -----------------------------------------------------------------------
// extractListItems — emoji img directly inside li (tight list, no <p> wrapper)
// -----------------------------------------------------------------------

describe('extractListItems — emoji img directly inside tight list li (via extractSlides)', () => {
  it('emoji img directly inside li is extracted as text run', () => {
    const { section } = setupSlide(
      '<ul id="ul"><li id="li">request<img class="emoji" alt="👉" src="https://twemoji/1f449.svg">analysis</li></ul>',
    )
    const ul = section.querySelector('#ul')!
    const li = section.querySelector('#li')!
    const img = section.querySelector('img')!

    mockRect(ul, { left: 0, top: 0, width: 600, height: 30 })
    mockRect(li, { left: 0, top: 0, width: 600, height: 30 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        ul,
        {
          display: 'block',
          fontSize: '16px',
          fontFamily: 'Arial',
          color: 'rgb(0,0,0)',
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: '24px',
        },
      ],
      [
        li,
        {
          display: 'list-item',
          fontSize: '16px',
          fontFamily: 'Arial',
          color: 'rgb(0,0,0)',
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: '24px',
        },
      ],
      [
        img,
        {
          display: 'inline',
          fontSize: '16px',
          fontFamily: 'Arial',
          color: 'rgb(0,0,0)',
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: '24px',
          backgroundColor: 'rgba(0,0,0,0)',
        },
      ],
    ])

    const slides = extractSlides()
    const list = slides[0].elements.find((e: any) => e.type === 'list') as any
    expect(list).toBeDefined()

    const item = list.items[0]
    const texts = item.runs
      .filter((r: any) => !r.breakLine)
      .map((r: any) => r.text)
    expect(texts).toContain('request')
    expect(texts).toContain('👉')
    expect(texts).toContain('analysis')

    restore()
  })

  it('extracts consecutive emoji as multiple text runs', () => {
    const { section } = setupSlide(
      '<ul id="ul"><li id="li">A<img class="emoji" alt="👉" src="https://twemoji/1f449.svg">B<img class="emoji" alt="👉" src="https://twemoji/1f449.svg">C</li></ul>',
    )
    const ul = section.querySelector('#ul')!
    const li = section.querySelector('#li')!
    const imgs = Array.from(section.querySelectorAll('img'))

    mockRect(ul, { left: 0, top: 0, width: 600, height: 30 })
    mockRect(li, { left: 0, top: 0, width: 600, height: 30 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        ul,
        {
          display: 'block',
          fontSize: '16px',
          fontFamily: 'Arial',
          color: 'rgb(0,0,0)',
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: '24px',
        },
      ],
      [
        li,
        {
          display: 'list-item',
          fontSize: '16px',
          fontFamily: 'Arial',
          color: 'rgb(0,0,0)',
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: '24px',
        },
      ],
      ...imgs.map(
        (img) =>
          [
            img,
            {
              display: 'inline',
              fontSize: '16px',
              fontFamily: 'Arial',
              color: 'rgb(0,0,0)',
              fontWeight: '400',
              fontStyle: 'normal',
              textAlign: 'left',
              lineHeight: '24px',
              backgroundColor: 'rgba(0,0,0,0)',
            },
          ] as [Element, Record<string, string>],
      ),
    ])

    const slides = extractSlides()
    const list = slides[0].elements.find((e: any) => e.type === 'list') as any
    const item = list.items[0]
    const texts = item.runs
      .filter((r: any) => !r.breakLine)
      .map((r: any) => r.text)
    expect(texts.filter((t: string) => t === '👉')).toHaveLength(2)
    expect(texts).toContain('A')
    expect(texts).toContain('B')
    expect(texts).toContain('C')

    restore()
  })
})

// -----------------------------------------------------------------------
// extractTextStyle — justify-content:center → textAlign:center
// -----------------------------------------------------------------------

describe('extractTextStyle justify-content:center mapping (via extractSlides)', () => {
  it('justify-content:center span has paragraph with textAlign:center', () => {
    const { section } = setupSlide('<span id="badge">1</span>')
    const badge = section.querySelector('#badge')!

    mockRect(badge, { left: 10, top: 10, width: 32, height: 32 })
    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        badge,
        {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'left', // CSS textAlign is left, justifyContent drives centering
          backgroundColor: 'rgb(0, 102, 204)',
          color: 'rgb(255,255,255)',
          borderRadius: '16px',
          fontSize: '14px',
          fontFamily: 'Arial',
          fontWeight: '700',
          lineHeight: '14px',
        },
      ],
    ])

    const slides = extractSlides()
    const para = slides[0].elements.find(
      (e: any) => e.type === 'paragraph',
    ) as any
    expect(para).toBeDefined()
    expect(para.style.textAlign).toBe('center')

    restore()
  })
})

// -----------------------------------------------------------------------
// extractInlineBadgeShapes — inline-block badge / pill inside paragraph
// -----------------------------------------------------------------------

describe('extractInlineBadgeShapes — inline-block badge inside paragraph (via extractSlides)', () => {
  it('leading badge in <p>: container shape emitted, paragraph starts after badge, no highlight', () => {
    // <p><badge>01</badge> Step title</p> — badge is at para left edge (leading)
    // → computeLeadingOffset → shape emitted, para x shifted right by badge width
    const { section } = setupSlide(`
      <p id="para"><span id="badge">01</span> Step title</p>
    `)
    const para = section.querySelector('#para')!
    const badge = section.querySelector('#badge')!

    mockRect(para, { left: 50, top: 100, width: 600, height: 36 })
    mockRect(badge, { left: 50, top: 102, width: 50, height: 32 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        para,
        {
          display: 'block',
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          color: 'rgb(0,0,0)',
          lineHeight: '22px',
          textAlign: 'left',
          backgroundColor: 'rgba(0,0,0,0)',
        },
      ],
      [
        badge,
        {
          display: 'inline-block',
          backgroundColor: 'rgb(0,102,204)',
          color: 'rgb(255,255,255)',
          borderRadius: '999px',
          fontSize: '14px',
          fontFamily: 'Arial',
          fontWeight: '700',
          textAlign: 'center',
          lineHeight: '14px',
        },
      ],
    ])

    const slides = extractSlides()
    const elements = slides[0].elements

    // Container shape MUST be emitted (leading badge → always a shape)
    const containerIdx = elements.findIndex((e: any) => e.type === 'container')
    const paragraphIdx = elements.findIndex((e: any) => e.type === 'paragraph')
    expect(containerIdx).toBeGreaterThanOrEqual(0)
    expect(paragraphIdx).toBeGreaterThan(containerIdx)

    // Badge text is in the shape — with NO backgroundColor (no stray highlight)
    const container = elements[containerIdx] as any
    expect(container.style.backgroundColor).toBe('rgb(0,102,204)')
    expect(container.style.borderRadius).toBe(999)
    const badgeRunInShape = container.runs?.find((r: any) => r.text === '01')
    expect(badgeRunInShape).toBeDefined()
    expect(badgeRunInShape.backgroundColor).toBeUndefined() // KEY: no highlight on shape text

    // Paragraph text box is shifted right to start after the badge
    // para.left=50, badge.width=50 → para x = 50+50=100, width = 600-50=550
    const paragraph = elements[paragraphIdx] as any
    expect(paragraph.x).toBe(100) // offset by badge width
    expect(paragraph.width).toBe(550) // reduced by badge width

    // Badge text '01' NOT in paragraph runs
    const badgeInPara = paragraph.runs?.find((r: any) => r.text === '01')
    expect(badgeInPara).toBeUndefined()

    restore()
  })

  it('ISOLATED badge in <p>: emits container shape with runs, no paragraph', () => {
    // <p><badge>HIGH</badge></p> — badge is the sole content (no text nodes)
    // → container shape with centered text, no paragraph emitted
    const { section } = setupSlide(`
      <p id="para"><span id="badge">HIGH</span></p>
    `)
    const para = section.querySelector('#para')!
    const badge = section.querySelector('#badge')!

    mockRect(para, { left: 50, top: 100, width: 120, height: 36 })
    mockRect(badge, { left: 50, top: 102, width: 100, height: 32 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        para,
        {
          display: 'block',
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          color: 'rgb(0,0,0)',
          lineHeight: '22px',
          textAlign: 'left',
          backgroundColor: 'rgba(0,0,0,0)',
        },
      ],
      [
        badge,
        {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(220,53,69)',
          color: 'rgb(255,255,255)',
          borderRadius: '999px',
          fontSize: '14px',
          fontFamily: 'Arial',
          fontWeight: '700',
          textAlign: 'center',
          lineHeight: '14px',
        },
      ],
    ])

    const slides = extractSlides()
    const elements = slides[0].elements

    // Isolated badge (no surrounding text) → shape only, no paragraph
    const containerIdx = elements.findIndex((e: any) => e.type === 'container')
    expect(containerIdx).toBeGreaterThanOrEqual(0)
    const container = elements[containerIdx] as any
    expect(container.style.backgroundColor).toBe('rgb(220,53,69)')
    const badgeRun = container.runs?.find((r: any) => r.text === 'HIGH')
    expect(badgeRun).toBeDefined()
    expect(badgeRun.backgroundColor).toBeUndefined() // no highlight on shape text

    // No paragraph (no non-badge text → extractTextRuns returns empty)
    const paragraphIdx = elements.findIndex((e: any) => e.type === 'paragraph')
    expect(paragraphIdx).toBe(-1)

    restore()
  })

  it('leading badge in heading: container shape emitted, heading starts after badge, no highlight', () => {
    // <h2><badge>01</badge> Section Title</h2> — badge at heading left edge
    // → shape emitted, heading text box shifted right by badge width
    const { section } = setupSlide(`
      <h2 id="heading"><span id="badge">01</span> Section Title</h2>
    `)
    const heading = section.querySelector('#heading')!
    const badge = section.querySelector('#badge')!

    mockRect(heading, { left: 50, top: 50, width: 700, height: 48 })
    mockRect(badge, { left: 50, top: 55, width: 44, height: 38 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        heading,
        {
          display: 'block',
          fontSize: '32px',
          fontFamily: 'Arial',
          fontWeight: '700',
          color: 'rgb(0,0,0)',
          lineHeight: '40px',
          textAlign: 'left',
          backgroundColor: 'rgba(0,0,0,0)',
          borderBottomWidth: '0px',
          borderLeftWidth: '0px',
        },
      ],
      [
        badge,
        {
          display: 'inline-block',
          backgroundColor: 'rgb(200,50,50)',
          color: 'rgb(255,255,255)',
          borderRadius: '999px',
          fontSize: '18px',
          fontFamily: 'Arial',
          fontWeight: '700',
          textAlign: 'center',
          lineHeight: '18px',
        },
      ],
    ])

    const slides = extractSlides()
    const elements = slides[0].elements

    // Container for badge emitted before the heading
    const containerIdx = elements.findIndex((e: any) => e.type === 'container')
    const headingIdx = elements.findIndex((e: any) => e.type === 'heading')
    expect(containerIdx).toBeGreaterThanOrEqual(0)
    expect(headingIdx).toBeGreaterThan(containerIdx)

    const container = elements[containerIdx] as any
    expect(container.style.backgroundColor).toBe('rgb(200,50,50)')
    expect(container.style.borderRadius).toBe(999)
    const badgeRunInShape = container.runs?.find((r: any) => r.text === '01')
    expect(badgeRunInShape).toBeDefined()
    expect(badgeRunInShape.backgroundColor).toBeUndefined() // no highlight on shape text

    // Heading starts after the badge: x = 50+44=94, width = 700-44=656
    const headingEl = elements[headingIdx] as any
    expect(headingEl.x).toBe(94)
    expect(headingEl.width).toBe(656)

    // Badge text '01' NOT in heading runs
    const badgeInHeading = headingEl.runs?.find((r: any) => r.text === '01')
    expect(badgeInHeading).toBeUndefined()

    restore()
  })

  it('does not emit container for inline span without background', () => {
    const { section } = setupSlide(
      '<p id="para"><span id="normal">plain text</span></p>',
    )
    const para = section.querySelector('#para')!
    const span = section.querySelector('#normal')!

    mockRect(para, { left: 0, top: 0, width: 600, height: 24 })
    mockRect(span, { left: 0, top: 0, width: 100, height: 24 })

    const restore = mockStyles([
      [section, { backgroundColor: 'rgb(255,255,255)' }],
      [
        para,
        {
          display: 'block',
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          color: 'rgb(0,0,0)',
          lineHeight: '24px',
          textAlign: 'left',
          backgroundColor: 'rgba(0,0,0,0)',
        },
      ],
      [
        span,
        {
          display: 'inline-block',
          backgroundColor: 'rgba(0,0,0,0)',
          color: 'rgb(0,0,0)',
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          textAlign: 'left',
          lineHeight: '24px',
        },
      ],
    ])

    const slides = extractSlides()
    const containerEl = slides[0].elements.find(
      (e: any) => e.type === 'container',
    )
    expect(containerEl).toBeUndefined()

    restore()
  })
})
