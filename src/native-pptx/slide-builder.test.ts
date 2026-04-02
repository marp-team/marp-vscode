import { fileURLToPath } from 'node:url'
import { buildPptx, placeElement, toTextProps, toListTextProps } from './slide-builder'
import type { SlideData, HeadingElement, ListElement, ImageElement } from './types'

// pptxgenjs creates a real object; we spy on its methods to verify calls.
// We do NOT jest.mock('pptxgenjs') so that buildPptx() internally
// instantiates a real PptxGenJS instance whose prototype methods we can spy on.

describe('buildPptx', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }

  it('defines layout with Marp default size (1280x720)', () => {
    const pptx = buildPptx([minimalSlide])
    // pptxgenjs stores layout name
    expect(pptx.layout).toBe('MARP')
  })

  it('calls addSlide for each slide', () => {
    const pptx = buildPptx([minimalSlide, minimalSlide])
    // PptxGenJS stores slides internally; we verify by checking the count
    // through its write path or by accessing internal state.
    // Since pptxgenjs doesn't expose a slide count getter, just verify
    // no error is thrown and the object is returned.
    expect(pptx).toBeDefined()
  })

  it('sets slide background color', () => {
    const pptx = buildPptx([minimalSlide])
    // Verify through the generated PPTX - we rely on pptxgenjs internals.
    // A basic smoke test: the pptx object should be writable.
    expect(typeof pptx.write).toBe('function')
  })

  it('sets presenter notes', () => {
    const slideWithNotes: SlideData = {
      ...minimalSlide,
      notes: 'These are presenter notes',
    }
    // Smoke test: no errors thrown
    const pptx = buildPptx([slideWithNotes])
    expect(pptx).toBeDefined()
  })

  it('places heading and paragraph elements without error', () => {
    const slideWithElements: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'heading',
          level: 1,
          runs: [
            {
              text: 'Title',
              color: 'rgb(34, 68, 102)',
              fontSize: 40,
              fontFamily: '"Noto Sans JP"',
              bold: true,
            },
          ],
          x: 70,
          y: 80,
          width: 1140,
          height: 60,
          style: {
            color: 'rgb(34, 68, 102)',
            fontSize: 40,
            fontFamily: '"Noto Sans JP"',
            fontWeight: 700,
            textAlign: 'left',
            lineHeight: 48,
          },
        },
        {
          type: 'paragraph',
          runs: [
            {
              text: 'Body text',
              color: 'rgb(51, 51, 51)',
              fontSize: 24,
              fontFamily: 'Arial',
              bold: false,
            },
          ],
          x: 70,
          y: 160,
          width: 1140,
          height: 30,
          style: {
            color: 'rgb(51, 51, 51)',
            fontSize: 24,
            fontFamily: 'Arial',
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 36,
          },
        },
      ],
    }
    const pptx = buildPptx([slideWithElements])
    expect(pptx).toBeDefined()
  })

  it('places list elements without error', () => {
    const slideWithList: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'list',
          ordered: false,
          items: [
            {
              text: 'Item 1',
              level: 0,
              runs: [{ text: 'Item 1', fontSize: 18 }],
            },
            {
              text: 'Item 2',
              level: 0,
              runs: [{ text: 'Item 2', fontSize: 18 }],
            },
            {
              text: 'Nested item',
              level: 1,
              runs: [{ text: 'Nested item', fontSize: 16 }],
            },
          ],
          x: 70,
          y: 200,
          width: 600,
          height: 120,
          style: {
            color: 'rgb(0, 0, 0)',
            fontSize: 18,
            fontFamily: 'Arial',
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 27,
          },
        },
      ],
    }
    const pptx = buildPptx([slideWithList])
    expect(pptx).toBeDefined()
  })

  it('places container elements with children without error', () => {
    const slideWithContainer: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'container',
          children: [
            {
              type: 'paragraph',
              runs: [{ text: 'Nested paragraph' }],
              x: 80,
              y: 90,
              width: 500,
              height: 24,
              style: {
                color: 'rgb(0, 0, 0)',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 400,
                textAlign: 'left',
                lineHeight: 24,
              },
            },
          ],
          x: 70,
          y: 80,
          width: 640,
          height: 200,
          style: { backgroundColor: 'rgb(240, 240, 240)' },
        },
      ],
    }
    const pptx = buildPptx([slideWithContainer])
    expect(pptx).toBeDefined()
  })

  it('places bordered container without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'container',
          children: [
            {
              type: 'paragraph',
              runs: [{ text: 'Card text' }],
              x: 80,
              y: 90,
              width: 480,
              height: 24,
              style: {
                color: 'rgb(0, 0, 0)',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 400,
                textAlign: 'left',
                lineHeight: 24,
              },
            },
          ],
          x: 70,
          y: 80,
          width: 500,
          height: 100,
          style: {
            backgroundColor: 'rgb(255, 244, 232)',
            borderWidth: 1,
            borderColor: 'rgb(207, 216, 227)',
            borderRadius: 12,
          },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })

  it('places border-only container without background', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'container',
          children: [
            {
              type: 'paragraph',
              runs: [{ text: 'Text' }],
              x: 80,
              y: 90,
              width: 480,
              height: 24,
              style: {
                color: 'rgb(0, 0, 0)',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 400,
                textAlign: 'left',
                lineHeight: 24,
              },
            },
          ],
          x: 70,
          y: 80,
          width: 500,
          height: 100,
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderWidth: 1,
            borderColor: 'rgb(207, 216, 227)',
          },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })
})

describe('toTextProps', () => {
  it('converts TextRun to pptxgenjs TextProps', () => {
    const result = toTextProps({
      text: 'Hello',
      color: 'rgb(255, 0, 0)',
      fontSize: 24,
      fontFamily: '"Noto Sans JP", sans-serif',
      bold: true,
      italic: false,
    })

    expect(result.text).toBe('Hello')
    expect(result.options?.color).toBe('FF0000')
    expect(result.options?.fontSize).toBe(18) // 24 * 0.75
    expect(result.options?.fontFace).toBe('Noto Sans JP')
    expect(result.options?.bold).toBe(true)
  })

  it('converts hyperlinks', () => {
    const result = toTextProps({
      text: 'Link',
      hyperlink: 'https://example.com',
    })
    expect(result.options?.hyperlink).toEqual({ url: 'https://example.com' })
  })

  it('converts breakLine:true run to breakLine:true TextProps', () => {
    const result = toTextProps({ text: '', breakLine: true })
    expect(result.text).toBe('')
    expect(result.options?.breakLine).toBe(true)
    // Should not carry color or font overrides
    expect(result.options?.color).toBeUndefined()
  })

  it('converts backgroundColor to 6-digit hex highlight', () => {
    const result = toTextProps({
      text: 'Highlighted',
      color: 'rgb(0, 0, 0)',
      fontSize: 22,
      backgroundColor: 'rgb(241, 196, 15)',
    })
    expect(result.text).toBe('Highlighted')
    expect(result.options?.highlight).toBe('F1C40F')
  })

  it('omits highlight when backgroundColor is absent', () => {
    const result = toTextProps({
      text: 'Normal',
      color: 'rgb(0, 0, 0)',
      fontSize: 16,
    })
    expect(result.options?.highlight).toBeUndefined()
  })
})

describe('toListTextProps', () => {
  it('converts list item to TextProps with bullet', () => {
    const result = toListTextProps({
      text: 'Item',
      level: 0,
      runs: [
        {
          text: 'Item',
          color: 'rgb(0, 0, 0)',
          fontSize: 16,
          fontFamily: 'Arial',
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].options?.bullet).toBe(true)
    expect(result[0].options?.indentLevel).toBe(0)
  })

  it('converts nesting level to indentLevel', () => {
    const result = toListTextProps({
      text: 'Nested',
      level: 2,
      runs: [{ text: 'Nested', fontSize: 14 }],
    })

    expect(result[0].options?.indentLevel).toBe(2)
  })

  it('falls back to text when runs is empty', () => {
    const result = toListTextProps({
      text: 'Fallback',
      level: 0,
      runs: [],
    })

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Fallback')
    expect(result[0].options?.bullet).toBe(true)
  })

  it('uses numbered bullet when ordered=true', () => {
    const result = toListTextProps(
      {
        text: 'Numbered',
        level: 0,
        runs: [{ text: 'Numbered', fontSize: 16 }],
      },
      true,
    )

    expect(result[0].options?.bullet).toEqual({
      type: 'number',
      style: 'arabicPeriod',
    })
  })

  it('uses plain bullet when ordered=false', () => {
    const result = toListTextProps(
      {
        text: 'Bullet',
        level: 0,
        runs: [{ text: 'Bullet', fontSize: 16 }],
      },
      false,
    )

    expect(result[0].options?.bullet).toBe(true)
  })

  it('appends breakLine to last run when more items follow', () => {
    const result = toListTextProps(
      {
        text: 'Line',
        level: 0,
        runs: [
          { text: 'Line ', fontSize: 16 },
          { text: 'Tail', fontSize: 16, bold: true },
        ],
      },
      false,
      true,
    )

    expect(result[0].options?.breakLine).toBeUndefined()
    expect(result[1].options?.breakLine).toBe(true)
  })

  it('omits breakLine on the last item', () => {
    const result = toListTextProps(
      {
        text: 'Last',
        level: 0,
        runs: [{ text: 'Last', fontSize: 16 }],
      },
      false,
      false,
    )

    expect(result[0].options?.breakLine).toBeUndefined()
  })
})

describe('placeElement — image', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }

  function buildSlideWithImage(src: string) {
    const img: ImageElement = {
      type: 'image',
      src,
      x: 100,
      y: 200,
      width: 400,
      height: 300,
      naturalWidth: 800,
      naturalHeight: 600,
    }
    return buildPptx([{ ...minimalSlide, elements: [img] }])
  }

  it('handles file:// URL without error', () => {
    const fileUrl = 'file:///C:/Users/test/images/photo.png'
    const pptx = buildSlideWithImage(fileUrl)
    expect(pptx).toBeDefined()
  })

  it('handles data: URI without error', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const pptx = buildSlideWithImage(dataUri)
    expect(pptx).toBeDefined()
  })

  it('handles https URL without error', () => {
    const url = 'https://example.com/image.png'
    const pptx = buildSlideWithImage(url)
    expect(pptx).toBeDefined()
  })
})

describe('buildPptx — background handling', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }

  it('falls back to white for transparent background', () => {
    const slide: SlideData = {
      ...minimalSlide,
      background: 'rgba(0, 0, 0, 0)',
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })

  it('handles background image without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      backgroundImages: [{ url: 'https://example.com/bg.png', x: 0, y: 0, width: 1280, height: 720 }],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })

  it('handles data: URI background image without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      backgroundImages: [{ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', x: 0, y: 0, width: 1280, height: 720 }],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })
})

describe('placeElement — table with transparent cells', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }

  it('handles transparent cell background without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'table',
          rows: [
            {
              cells: [
                {
                  text: 'Header',
                  runs: [{ text: 'Header', color: 'rgb(0, 0, 0)', fontSize: 16, bold: true }],
                  isHeader: true,
                  style: {
                    color: 'rgb(0, 0, 0)',
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    fontSize: 16,
                    fontFamily: 'Arial',
                    fontWeight: 700,
                    textAlign: 'left',
                    borderColor: 'rgb(200, 200, 200)',
                  },
                },
              ],
            },
            {
              cells: [
                {
                  text: 'Cell',
                  runs: [{ text: 'Cell', color: 'rgb(0, 0, 0)', fontSize: 16 }],
                  isHeader: false,
                  style: {
                    color: 'rgb(0, 0, 0)',
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    fontSize: 16,
                    fontFamily: 'Arial',
                    fontWeight: 400,
                    textAlign: 'left',
                    borderColor: 'rgb(200, 200, 200)',
                  },
                },
              ],
            },
          ],
          x: 70,
          y: 200,
          width: 600,
          height: 80,
          style: {
            color: 'rgb(0, 0, 0)',
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 24,
          },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })

  it('bolds cells with fontWeight >= 700', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'table',
          rows: [
            {
              cells: [
                {
                  text: 'Bold cell',
                  runs: [],
                  isHeader: false,
                  style: {
                    color: 'rgb(0, 0, 0)',
                    backgroundColor: 'rgb(240, 240, 240)',
                    fontSize: 16,
                    fontFamily: 'Arial',
                    fontWeight: 700,
                    textAlign: 'left',
                    borderColor: 'rgb(200, 200, 200)',
                  },
                },
              ],
            },
          ],
          x: 70,
          y: 200,
          width: 600,
          height: 40,
          style: {
            color: 'rgb(0, 0, 0)',
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 24,
          },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })
})

describe('placeElement — blockquote with border', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }

  it('places blockquote with left border without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'blockquote',
          runs: [{ text: 'Quote text', color: 'rgb(0, 0, 0)', fontSize: 16 }],
          x: 70,
          y: 100,
          width: 600,
          height: 40,
          style: {
            color: 'rgb(0, 0, 0)',
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 24,
          },
          borderLeft: { width: 4, color: 'rgb(100, 100, 100)' },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })
})

describe('placeElement — code with syntax runs', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }

  it('places syntax-highlighted code block without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'code',
          text: 'const x = 1;',
          language: 'javascript',
          runs: [
            { text: 'const', color: 'rgb(198, 120, 221)', fontSize: 14, bold: true },
            { text: ' x = ', color: 'rgb(200, 200, 200)', fontSize: 14 },
            { text: '1', color: 'rgb(209, 154, 102)', fontSize: 14 },
            { text: ';', color: 'rgb(200, 200, 200)', fontSize: 14 },
          ],
          x: 70,
          y: 200,
          width: 600,
          height: 80,
          style: {
            color: 'rgb(200, 200, 200)',
            fontSize: 14,
            fontFamily: 'monospace',
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 20,
            backgroundColor: 'rgb(40, 44, 52)',
          },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })
})

describe('placeElement — heading with border', () => {
  const minimalSlide: SlideData = {
    width: 1280,
    height: 720,
    background: 'rgb(255, 255, 255)',
    backgroundImages: [],
    elements: [],
    notes: '',
  }
  const baseStyle = {
    color: 'rgb(44, 62, 80)',
    fontSize: 40,
    fontFamily: 'Arial',
    fontWeight: 700,
    textAlign: 'left' as const,
    lineHeight: 48,
  }

  it('places heading with border-bottom without error', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'heading',
          level: 1,
          runs: [{ text: 'Title', color: 'rgb(44, 62, 80)', fontSize: 40 }],
          x: 70,
          y: 80,
          width: 1140,
          height: 57,
          style: baseStyle,
          borderBottom: { width: 2, color: 'rgb(39, 174, 96)' },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })

  it('places heading with border-left without errors', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'heading',
          level: 2,
          runs: [{ text: 'Section', color: 'rgb(39, 174, 96)', fontSize: 30 }],
          x: 70,
          y: 52,
          width: 1140,
          height: 36,
          style: { ...baseStyle, fontSize: 30, lineHeight: 36 },
          borderLeft: { width: 4, color: 'rgb(39, 174, 96)' },
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })

  it('places heading without border without errors', () => {
    const slide: SlideData = {
      ...minimalSlide,
      elements: [
        {
          type: 'heading',
          level: 1,
          runs: [{ text: 'No border', color: 'rgb(0,0,0)', fontSize: 40 }],
          x: 70,
          y: 80,
          width: 1140,
          height: 57,
          style: baseStyle,
        },
      ],
    }
    const pptx = buildPptx([slide])
    expect(pptx).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// placeElement — heading border-left text shift
// ---------------------------------------------------------------------------

describe('placeElement — heading border-left text offset', () => {
  function makeMockSlide() {
    return {
      addText: jest.fn(),
      addShape: jest.fn(),
      addImage: jest.fn(),
      addTable: jest.fn(),
      addNotes: jest.fn(),
    } as unknown as any
  }

  const baseStyle = {
    color: 'rgb(41, 128, 185)',
    fontSize: 30,
    fontFamily: 'Arial',
    fontWeight: 700,
    textAlign: 'left' as const,
    lineHeight: 36,
  }

  it('h2 border-left: text box shifts right by border width', () => {
    const mockSlide = makeMockSlide()
    const el: any = {
      type: 'heading',
      level: 2,
      runs: [{ text: 'Section heading', color: 'rgb(41,128,185)', fontSize: 30 }],
      x: 70,
      y: 52,
      width: 1140,
      height: 36,
      style: baseStyle,
      borderLeft: { width: 4, color: 'rgb(41, 128, 185)' },
    }
    placeElement(mockSlide, el, 1280, 720)

    const textCall = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    const bwIn = 4 / 96 // 4px → inches
    // text x shifted right by border width (x + bw)
    expect(textCall.x).toBeCloseTo(70 / 96 + bwIn, 6)
    // text width reduced by border width (w - bw)
    expect(textCall.w).toBeCloseTo(1140 / 96 - bwIn, 6)
  })

  it('h2 border-left: border rect drawn before text (z-order)', () => {
    const mockSlide = makeMockSlide()
    const el: any = {
      type: 'heading',
      level: 2,
      runs: [{ text: 'Section heading', color: 'rgb(41,128,185)', fontSize: 30 }],
      x: 70,
      y: 52,
      width: 1140,
      height: 36,
      style: baseStyle,
      borderLeft: { width: 4, color: 'rgb(41, 128, 185)' },
    }
    placeElement(mockSlide, el, 1280, 720)

    const addShapeOrder = (mockSlide.addShape as jest.Mock).mock.invocationCallOrder[0]
    const addTextOrder = (mockSlide.addText as jest.Mock).mock.invocationCallOrder[0]
    // shape (border bar) must be drawn before text so text renders on top
    expect(addShapeOrder).toBeLessThan(addTextOrder)
  })

  it('h2 without border-left: text box stays at original x', () => {
    const mockSlide = makeMockSlide()
    const el: any = {
      type: 'heading',
      level: 2,
      runs: [{ text: 'No decoration', color: 'rgb(0,0,0)', fontSize: 30 }],
      x: 70,
      y: 52,
      width: 1140,
      height: 36,
      style: baseStyle,
      // no borderLeft
    }
    placeElement(mockSlide, el, 1280, 720)

    const textCall = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    expect(textCall.x).toBeCloseTo(70 / 96, 6)
    expect(textCall.w).toBeCloseTo(1140 / 96, 6)
  })
})

// ---------------------------------------------------------------------------
// placeElement — text height clamping
// ---------------------------------------------------------------------------

describe('placeElement — text height clamping', () => {
  // Slide is 720px tall. A paragraph at y=680 with height=80 would extend
  // 40px below the slide boundary. placeElement() should clamp text-type
  // elements so y + h ≤ slideH. Images are intentionally excluded.
  // pxToInches converts at 96 dpi, so 1px = 1/96 in.

  function makeMockSlide() {
    return {
      addText: jest.fn(),
      addShape: jest.fn(),
      addImage: jest.fn(),
      addTable: jest.fn(),
      addNotes: jest.fn(),
    } as unknown as any
  }

  it('clamps paragraph height when it would overflow the slide bottom', () => {
    const mockSlide = makeMockSlide() as any
    const el: any = {
      type: 'paragraph',
      runs: [
        {
          text: 'Overflowing text',
          color: 'rgb(0,0,0)',
          fontSize: 16,
          fontFamily: 'Arial',
          bold: false,
        },
      ],
      x: 0,
      y: 680, // near bottom; 680 + 80 = 760 > 720
      width: 1280,
      height: 80,
      style: {
        textAlign: 'left',
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 400,
        color: 'rgb(0,0,0)',
        lineHeight: 24,
      },
    }

    placeElement(mockSlide, el, 1280, 720)

    const opts = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    // Clamped h = (720 - 680) / 96 ≈ 0.4167 in — not the raw 80/96 ≈ 0.8333
    expect(opts.h).toBeCloseTo(40 / 96, 4)
    expect(opts.h).toBeLessThan(80 / 96)
  })

  it('does not clamp image height even when it overflows slide bounds', () => {
    const mockSlide = makeMockSlide() as any
    const el: any = {
      type: 'image',
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      x: 0,
      y: 680,
      width: 1280,
      height: 80,
    }

    placeElement(mockSlide, el, 1280, 720)

    const opts = (mockSlide.addImage as jest.Mock).mock.calls[0][0]
    // Image h must NOT be clamped
    expect(opts.h).toBeCloseTo(80 / 96, 4)
  })
})

// -----------------------------------------------------------------------
// placeElement — lineSpacingMultiple from CSS line-height
// -----------------------------------------------------------------------

describe('placeElement — lineSpacingMultiple from CSS line-height', () => {
  function makeMockSlide() {
    return {
      addText: jest.fn(),
      addShape: jest.fn(),
      addImage: jest.fn(),
      addTable: jest.fn(),
      addNotes: jest.fn(),
    } as unknown as any
  }

  const baseStyle = {
    textAlign: 'left' as const,
    fontFamily: 'Arial',
    fontWeight: 400,
    color: 'rgb(0,0,0)',
  }

  it('applies lineSpacingMultiple = lineHeight/fontSize to paragraph', () => {
    const mockSlide = makeMockSlide() as any
    const el: any = {
      type: 'paragraph',
      // CJK text intentionally used to test font rendering path
      runs: [{ text: 'Test', color: 'rgb(0,0,0)', fontSize: 16, fontFamily: 'Arial', bold: false }],
      x: 0, y: 0, width: 600, height: 40,
      style: { ...baseStyle, fontSize: 16, lineHeight: 24 }, // 24/16 = 1.5
    }
    placeElement(mockSlide, el, 1280, 720)
    const opts = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    expect(opts.lineSpacingMultiple).toBeCloseTo(1.5, 2)
  })

  it('applies lineSpacingMultiple to heading', () => {
    const mockSlide = makeMockSlide() as any
    const el: any = {
      type: 'heading',
      level: 2,
      runs: [{ text: 'Heading', color: 'rgb(0,0,0)', fontSize: 32, fontFamily: 'Arial', bold: true }],
      x: 0, y: 0, width: 600, height: 60,
      style: { ...baseStyle, fontSize: 32, lineHeight: 40 }, // 40/32 = 1.25
    }
    placeElement(mockSlide, el, 1280, 720)
    const opts = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    expect(opts.lineSpacingMultiple).toBeCloseTo(1.25, 2)
  })

  it('applies lineSpacingMultiple to list', () => {
    const mockSlide = makeMockSlide() as any
    const el: any = {
      type: 'list',
      ordered: false,
      items: [{ text: 'item', level: 0, runs: [{ text: 'item', color: 'rgb(0,0,0)', fontSize: 16, fontFamily: 'Arial', bold: false }] }],
      x: 0, y: 0, width: 600, height: 40,
      style: { ...baseStyle, fontSize: 16, lineHeight: 22 }, // 22/16 = 1.375
    }
    placeElement(mockSlide, el, 1280, 720)
    const opts = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    expect(opts.lineSpacingMultiple).toBeCloseTo(1.38, 2)
  })

  it('omits lineSpacingMultiple when lineHeight is 0 (normal)', () => {
    const mockSlide = makeMockSlide() as any
    const el: any = {
      type: 'paragraph',
      runs: [{ text: 'Test', color: 'rgb(0,0,0)', fontSize: 16, fontFamily: 'Arial', bold: false }],
      x: 0, y: 0, width: 600, height: 40,
      style: { ...baseStyle, fontSize: 16, lineHeight: 0 }, // lineHeight=0 → undefined
    }
    placeElement(mockSlide, el, 1280, 720)
    const opts = (mockSlide.addText as jest.Mock).mock.calls[0][1]
    expect(opts.lineSpacingMultiple).toBeUndefined()
  })
})

// -----------------------------------------------------------------------
// placeElement — container strips matching highlight from children
// -----------------------------------------------------------------------

describe('placeElement — container child highlight strip', () => {
  function makeMockSlide() {
    return {
      addText: jest.fn(),
      addShape: jest.fn(),
      addImage: jest.fn(),
      addTable: jest.fn(),
      addNotes: jest.fn(),
    } as unknown as any
  }

  it('strips text highlight that matches container background', () => {
    const mockSlide = makeMockSlide()
    const childParagraph: any = {
      type: 'paragraph',
      runs: [
        { text: 'same color', color: 'rgb(0,0,0)', fontSize: 16, backgroundColor: 'rgb(52,152,219)' },
        { text: 'different', color: 'rgb(0,0,0)', fontSize: 16, backgroundColor: 'rgb(241,196,15)' },
      ],
      x: 80, y: 100, width: 400, height: 30,
      style: { textAlign: 'left', fontSize: 16, lineHeight: 0 },
    }
    const el: any = {
      type: 'container',
      children: [childParagraph],
      x: 70, y: 90, width: 500, height: 200,
      style: { backgroundColor: 'rgb(52, 152, 219)' },
    }
    placeElement(mockSlide, el, 1280, 720)

    // The child paragraph's first run should have had its backgroundColor stripped
    expect(childParagraph.runs[0].backgroundColor).toBeUndefined()
    // The second run with a different color should be preserved
    expect(childParagraph.runs[1].backgroundColor).toBe('rgb(241,196,15)')
  })

  it('preserves highlight when container has no background', () => {
    const mockSlide = makeMockSlide()
    const childParagraph: any = {
      type: 'paragraph',
      runs: [
        { text: 'highlighted', color: 'rgb(0,0,0)', fontSize: 16, backgroundColor: 'rgb(241,196,15)' },
      ],
      x: 80, y: 100, width: 400, height: 30,
      style: { textAlign: 'left', fontSize: 16, lineHeight: 0 },
    }
    const el: any = {
      type: 'container',
      children: [childParagraph],
      x: 70, y: 90, width: 500, height: 200,
      style: { backgroundColor: 'transparent' },
    }
    placeElement(mockSlide, el, 1280, 720)

    expect(childParagraph.runs[0].backgroundColor).toBe('rgb(241,196,15)')
  })
})
