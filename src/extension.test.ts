import cheerio from 'cheerio'
import dedent from 'dedent'
import markdownIt from 'markdown-it'
import { commands, workspace } from 'vscode'

jest.mock('vscode')

const extension = (): typeof import('./extension') => {
  let ext
  jest.isolateModules(() => (ext = require('./extension'))) // Shut up cache

  return ext
}

const setConfiguration: (conf?: object) => void = (workspace as any)
  ._setConfiguration

const setVSCodeVersion: (version: string) => void = require('vscode')
  ._setVSCodeVersion

describe('#activate', () => {
  const extContext: any = { subscriptions: { push: jest.fn() } }

  it('contains #extendMarkdownIt', () => {
    const { activate, extendMarkdownIt } = extension()

    expect(activate(extContext)).toEqual(
      expect.objectContaining({ extendMarkdownIt })
    )
  })

  it('refreshes Markdown preview when affected configuration has changed', () => {
    extension().activate(extContext)

    const onDidChgConf = workspace.onDidChangeConfiguration as jest.Mock
    expect(onDidChgConf).toBeCalledWith(expect.any(Function))

    const [event] = onDidChgConf.mock.calls[0]
    event({ affectsConfiguration: jest.fn(() => true) })
    expect(commands.executeCommand).toBeCalledWith('markdown.preview.refresh')
  })
})

describe('#extendMarkdownIt', () => {
  const marpMd = (md: string) => `---\nmarp: true\n---\n\n${md}`

  describe('Marp Core', () => {
    const baseMd = '# Hello :wave:\n\n<!-- header: Hi -->'

    it('uses default engine when not enabled marp front-matter', () => {
      const confusingMd =
        '---\nmarp: false\n---\n\n```markdown\n---\nmarp: true\n---\n```'

      for (const markdown of [baseMd, confusingMd]) {
        const html = extension()
          .extendMarkdownIt(new markdownIt())
          .render(markdown)

        expect(html).not.toContain('<div id="marp-vscode">')
        expect(html).not.toContain('<style id="marp-vscode-style">')
        expect(html).not.toContain('svg')
        expect(html).not.toContain('img')
      }
    })

    it('uses Marp engine when enabled marp front-matter', () => {
      const html = extension()
        .extendMarkdownIt(new markdownIt())
        .render(marpMd(baseMd))

      expect(html).toContain('<div id="marp-vscode">')
      expect(html).toContain('<style id="marp-vscode-style">')
      expect(html).toContain('svg')
      expect(html).toContain('img')
    })
  })

  describe('Plugins', () => {
    describe('Line number', () => {
      const markdown = dedent`
        ---
        marp: true
        ---

        # Hello

        Paragraph

        ---

        ## Marp for VS Code
      `

      it('adds code-line class and data-line attribute to DOM', () => {
        const $ = cheerio.load(
          extension()
            .extendMarkdownIt(new markdownIt())
            .render(markdown)
        )

        // SVG slides
        const svg = $('svg.code-line')
        expect(svg.eq(0).data('line')).toBe(0)
        expect(svg.eq(1).data('line')).toBe(8)

        // Contents
        expect($('h1').data('line')).toBe(4)
        expect($('p').data('line')).toBe(6)
        expect($('h2').data('line')).toBe(10)
      })

      it('adds code-line class and data-line attribute only to SVG when enabled polyfill', () => {
        setVSCodeVersion('v1.35.0')

        const $ = cheerio.load(
          extension()
            .extendMarkdownIt(new markdownIt())
            .render(markdown)
        )

        expect($('svg.code-line[data-line]')).toHaveLength(2)
        expect($('h1[data-line]')).toHaveLength(0)
        expect($('p[data-line]')).toHaveLength(0)
        expect($('h2[data-line]')).toHaveLength(0)
      })
    })
  })

  describe('Workspace config', () => {
    const md = (opts = {}) => extension().extendMarkdownIt(new markdownIt(opts))

    describe('markdown.marp.breaks', () => {
      it('renders line-breaks when setting "on"', () => {
        setConfiguration({ 'markdown.marp.breaks': 'on' })
        expect(md().render(marpMd('foo\nbar'))).toContain('<br />')
      })

      it('ignores line-breaks when setting "off"', () => {
        setConfiguration({ 'markdown.marp.breaks': 'off' })
        expect(md().render(marpMd('foo\nbar'))).not.toContain('<br />')
      })

      it('uses inherited breaks option when setting "inherit"', () => {
        setConfiguration({ 'markdown.marp.breaks': 'inherit' })

        const text = marpMd('foo\nbar')
        expect(md({ breaks: false }).render(text)).not.toContain('<br />')
        expect(md({ breaks: true }).render(text)).toContain('<br />')
      })
    })

    describe('markdown.marp.enableHtml', () => {
      it('does not render HTML elements when disabled', () => {
        setConfiguration({ 'markdown.marp.enableHtml': false })

        const html = md().render(marpMd('<b>Hi</b>'))
        expect(html).not.toContain('<b>Hi</b>')
      })

      it("allows Marp Core's whitelisted HTML elements when disabled", () => {
        setConfiguration({ 'markdown.marp.enableHtml': false })

        const html = md().render(marpMd('line<br>break'))
        expect(html).toContain('line<br />break')
      })

      it('renders HTML elements when enabled', () => {
        setConfiguration({ 'markdown.marp.enableHtml': true })

        const html = md().render(marpMd('<b>Hi</b>'))
        expect(html).toContain('<b>Hi</b>')
      })
    })

    describe('window.zoomLevel', () => {
      const render = () => md().render(marpMd(''))

      it('does not assign data-zoom and data-polyfill when using VS Code >= 1.36', () => {
        setVSCodeVersion('v1.35.99')
        expect(render()).toContain('data-zoom')
        expect(render()).toContain('data-polyfill')

        setVSCodeVersion('v1.36.0-insider')
        expect(render()).not.toContain('data-zoom')
        expect(render()).not.toContain('data-polyfill')

        setVSCodeVersion('v1.36.0')
        expect(render()).not.toContain('data-zoom')
        expect(render()).not.toContain('data-polyfill')

        // Disable polyfill if passed version is invalid
        setVSCodeVersion('invalid')
        expect(render()).not.toContain('data-zoom')
        expect(render()).not.toContain('data-polyfill')
      })

      it('assigns the calculated scale to data-zoom attribute', () => {
        setVSCodeVersion('v1.35.0')

        setConfiguration({ 'window.zoomLevel': 1 })
        expect(render()).toContain('data-zoom="1.2"')

        setConfiguration({ 'window.zoomLevel': 2 })
        expect(render()).toContain('data-zoom="1.44"')
      })
    })
  })
})
