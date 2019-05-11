import markdownIt from 'markdown-it'
import { commands, workspace } from 'vscode'

jest.mock('vscode')

const setConfiguration: (conf?: object) => void = (workspace as any)
  ._setConfiguration

const extension = () => {
  let ext

  // Shut up cache of configuration
  jest.isolateModules(() => (ext = require('./extension')))

  return ext
}

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
        const { extendMarkdownIt } = extension()
        const html = extendMarkdownIt(new markdownIt()).render(markdown)

        expect(html).not.toContain('<div id="marp-vscode" data-zoom="1">')
        expect(html).not.toContain('<style id="marp-vscode-style">')
        expect(html).not.toContain('svg')
        expect(html).not.toContain('img')
      }
    })

    it('uses Marp engine when enabled marp front-matter', () => {
      const { extendMarkdownIt } = extension()
      const html = extendMarkdownIt(new markdownIt()).render(marpMd(baseMd))

      expect(html).toContain('<div id="marp-vscode" data-zoom="1">')
      expect(html).toContain('<style id="marp-vscode-style">')
      expect(html).toContain('svg')
      expect(html).toContain('img')
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
      it('assigns the calculated scale to data-zoom attribute', () => {
        setConfiguration({ 'window.zoomLevel': 1 })
        expect(md().render(marpMd(''))).toContain('data-zoom="1.2"')

        setConfiguration({ 'window.zoomLevel': 2 })
        expect(md().render(marpMd(''))).toContain('data-zoom="1.44"')
      })
    })
  })
})
