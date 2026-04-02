import { generateNativePptx } from './index'

// Mock puppeteer-core
const mockClose = jest.fn()
const mockSetViewport = jest.fn()
const mockGoto = jest.fn()
const mockEvaluate = jest.fn()
const mockAddScriptTag = jest.fn()
const mockAddStyleTag = jest.fn()
const mockNewPage = jest.fn().mockResolvedValue({
  setViewport: mockSetViewport,
  goto: mockGoto,
  evaluate: mockEvaluate,
  addScriptTag: mockAddScriptTag,
  addStyleTag: mockAddStyleTag,
})
const mockLaunch = jest.fn().mockResolvedValue({
  newPage: mockNewPage,
  close: mockClose,
})

jest.mock('puppeteer-core', () => ({
  __esModule: true,
  default: { launch: (...args: any[]) => mockLaunch(...args) },
}))

// Mock slide-builder
const mockWrite = jest.fn().mockResolvedValue(new ArrayBuffer(8))
const mockBuildPptx = jest.fn().mockReturnValue({ write: mockWrite })
jest.mock('./slide-builder', () => ({
  buildPptx: (...args: any[]) => mockBuildPptx(...args),
}))

// Mock the generated dom-walker script (string constant)
jest.mock('./dom-walker-script.generated', () => ({
  DOM_WALKER_SCRIPT: 'globalThis.extractSlides = function() { return []; };',
}))

describe('generateNativePptx', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEvaluate.mockResolvedValue([
      {
        width: 1280,
        height: 720,
        background: 'rgb(255,255,255)',
        backgroundImages: [],
        elements: [],
        notes: '',
      },
    ])
  })

  it('launches browser, loads HTML, extracts DOM, and returns PPTX buffer', async () => {
    const result = await generateNativePptx({
      htmlPath: '/tmp/test.html',
      browserPath: '/usr/bin/chrome',
    })

    // puppeteer launched with correct browser path
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({
        executablePath: '/usr/bin/chrome',
        headless: true,
      }),
    )

    // HTML was loaded via file:// URL to resolve relative paths correctly
    expect(mockGoto).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/.*test\.html$/),
      expect.objectContaining({ waitUntil: 'networkidle0' }),
    )

    // Bespoke UI elements (OSC overlay, note panels) were hidden via CSS
    // so they don't appear in Puppeteer background screenshots
    expect(mockAddStyleTag).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('bespoke-marp-osc'),
      }),
    )

    // DOM walker script was injected via addScriptTag
    expect(mockAddScriptTag).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.any(String) }),
    )

    // extractSlides was called via page.evaluate
    expect(mockEvaluate).toHaveBeenCalled()

    // buildPptx was called with extracted slides
    expect(mockBuildPptx).toHaveBeenCalledWith([
      expect.objectContaining({ width: 1280, height: 720 }),
    ])

    // Returns a Buffer
    expect(result).toBeInstanceOf(Buffer)
  })

  it('uses specified viewport size', async () => {
    await generateNativePptx({
      htmlPath: '/tmp/test.html',
      browserPath: '/usr/bin/chrome',
      width: 1920,
      height: 1080,
    })

    expect(mockSetViewport).toHaveBeenCalledWith({
      width: 1920,
      height: 1080,
    })
  })

  it('defaults to 1280x720 viewport', async () => {
    await generateNativePptx({
      htmlPath: '/tmp/test.html',
      browserPath: '/usr/bin/chrome',
    })

    expect(mockSetViewport).toHaveBeenCalledWith({
      width: 1280,
      height: 720,
    })
  })

  it('closes browser after completion', async () => {
    await generateNativePptx({
      htmlPath: '/tmp/test.html',
      browserPath: '/usr/bin/chrome',
    })

    expect(mockClose).toHaveBeenCalled()
  })

  it('closes browser even on error', async () => {
    mockEvaluate.mockRejectedValue(new Error('DOM extraction failed'))

    await expect(
      generateNativePptx({
        htmlPath: '/tmp/test.html',
        browserPath: '/usr/bin/chrome',
      }),
    ).rejects.toThrow('DOM extraction failed')

    expect(mockClose).toHaveBeenCalled()
  })
})
