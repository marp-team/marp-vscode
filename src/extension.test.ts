/** @jest-environment node */
import markdownIt from 'markdown-it'
import { workspace } from 'vscode'
import { activate, extendMarkdownIt } from './extension'

jest.mock('vscode')

const mockWorkspaceConfig = (conf: { [key: string]: any } = {}) => {
  const config = {
    'markdown.marp.enableHtml': false,
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
  it('contains #extendMarkdownIt', () =>
    expect((activate as any)({})).toEqual(
      expect.objectContaining({ extendMarkdownIt })
    ))
})

describe('#extendMarkdownIt', () => {
  const marpMd = (md: string) => `---\nmarp: true\n---\n\n${md}`

  describe('Marp Core', () => {
    const markdown = '# Hello :wave:\n\n<!-- header: Hi -->'

    it('uses default engine without marp front-matter', () => {
      const html = extendMarkdownIt(new markdownIt()).render(markdown)

      expect(html).not.toContain('<div id="marp-vscode">')
      expect(html).not.toContain('<style id="marp-vscode-style">')
      expect(html).not.toContain('svg')
      expect(html).not.toContain('img')
    })

    it('uses Marp engine with marp front-matter', () => {
      const html = extendMarkdownIt(new markdownIt()).render(marpMd(markdown))

      expect(html).toContain('<div id="marp-vscode">')
      expect(html).toContain('<style id="marp-vscode-style">')
      expect(html).toContain('svg')
      expect(html).toContain('img')
    })
  })

  describe('Workspace config', () => {
    const md = extendMarkdownIt(new markdownIt())

    describe('markdown.marp.enableHtml', () => {
      it('does not render HTML elements when disabled', () => {
        mockWorkspaceConfig({ 'markdown.marp.enableHtml': false })

        const html = md.render(marpMd('<b>Hi</b>'))
        expect(html).not.toContain('<b>Hi</b>')
      })

      it("allows Marp Core's whitelisted HTML elements when disabled", () => {
        mockWorkspaceConfig({ 'markdown.marp.enableHtml': false })

        const html = md.render(marpMd('line<br>break'))
        expect(html).toContain('line<br />break')
      })

      it('renders HTML elements when enabled', () => {
        mockWorkspaceConfig({ 'markdown.marp.enableHtml': true })

        const html = md.render(marpMd('<b>Hi</b>'))
        expect(html).toContain('<b>Hi</b>')
      })
    })
  })
})
