/** @jest-environment node */
import markdownIt from 'markdown-it'
import { workspace } from 'vscode'

jest.mock('vscode')

const extension = () => {
  let ext

  // Shut up cache of configuration
  jest.isolateModules(() => (ext = require('./extension')))

  return ext
}

const mockWorkspaceConfig = (conf: { [key: string]: any } = {}) => {
  const config = {
    'markdown.marp.enableHtml': false,
    'window.zoomLevel': 0,
    ...conf,
  }

  const confSpy = jest.spyOn(workspace, 'getConfiguration') as jest.SpyInstance
  confSpy.mockImplementation((section?: string) => {
    const entries: any[] = Object.entries(config)
      .map(([k, v]) => {
        if (!section) return [k, v]

        return k.startsWith(`${section}.`)
          ? [k.slice(section.length + 1), v]
          : undefined
      })
      .filter(tuple => tuple)

    return new Map<string, any>(entries)
  })
}

beforeEach(() => mockWorkspaceConfig())
afterEach(() => jest.restoreAllMocks())

describe('#activate', () => {
  const extContext: any = { subscriptions: { push: jest.fn() } }

  it('contains #extendMarkdownIt', () => {
    const { activate, extendMarkdownIt } = extension()

    expect(activate(extContext)).toEqual(
      expect.objectContaining({ extendMarkdownIt })
    )
    expect(workspace.onDidChangeConfiguration).toBeCalledWith(
      expect.any(Function)
    )
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
    const md = () => extension().extendMarkdownIt(new markdownIt())

    describe('window.zoomLevel', () => {
      it('assigns the calculated scale to data-zoom attribute', () => {
        mockWorkspaceConfig({ 'window.zoomLevel': 1 })
        expect(md().render(marpMd(''))).toContain('data-zoom="1.2"')

        mockWorkspaceConfig({ 'window.zoomLevel': 2 })
        expect(md().render(marpMd(''))).toContain('data-zoom="1.44"')
      })
    })

    describe('markdown.marp.enableHtml', () => {
      it('does not render HTML elements when disabled', () => {
        mockWorkspaceConfig({ 'markdown.marp.enableHtml': false })

        const html = md().render(marpMd('<b>Hi</b>'))
        expect(html).not.toContain('<b>Hi</b>')
      })

      it("allows Marp Core's whitelisted HTML elements when disabled", () => {
        mockWorkspaceConfig({ 'markdown.marp.enableHtml': false })

        const html = md().render(marpMd('line<br>break'))
        expect(html).toContain('line<br />break')
      })

      it('renders HTML elements when enabled', () => {
        mockWorkspaceConfig({ 'markdown.marp.enableHtml': true })

        const html = md().render(marpMd('<b>Hi</b>'))
        expect(html).toContain('<b>Hi</b>')
      })
    })
  })
})
