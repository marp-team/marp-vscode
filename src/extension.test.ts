/** @jest-environment node */
import { Marp } from '@marp-team/marp-core'
import markdownIt from 'markdown-it'
import markdownItEmoji from 'markdown-it-emoji'
import { activate, extendMarkdownIt } from './extension'

afterEach(() => jest.restoreAllMocks())

describe('#activate', () => {
  it('contains #extendMarkdownIt', () =>
    expect(activate()).toEqual(expect.objectContaining({ extendMarkdownIt })))
})

describe('#extendMarkdownIt', () => {
  const marpMd = (md: string) => `---\nmarp: true\n---\n\n${md}`

  describe('Marp Core', () => {
    const markdown = '# Hello :wave:\n\n<!-- header: Hi -->'

    it('has not any extends without marp front-matter', () => {
      const html = extendMarkdownIt(new markdownIt()).render(markdown)

      expect(html).not.toContain('<div id="marp-vscode">')
      expect(html).not.toContain('<style id="marp-vscode-style">')
      expect(html).not.toContain('svg')
      expect(html).not.toContain('img')
    })

    it('extends Marp feature with marp front-matter', () => {
      const html = extendMarkdownIt(new markdownIt()).render(marpMd(markdown))

      expect(html).toContain('<div id="marp-vscode">')
      expect(html).toContain('<style id="marp-vscode-style">')
      expect(html).toContain('svg')
      expect(html).toContain('img')
    })
  })

  describe('Emoji support', () => {
    it('overrides injected markdown-it-emoji renderer by other plugin', () => {
      const md = extendMarkdownIt(new markdownIt().use(markdownItEmoji))

      expect(md.render(':+1:')).not.toContain('data-marp-twemoji')
      expect(md.render(marpMd(':+1:'))).toContain('data-marp-twemoji')
    })
  })

  describe('Code highlight', () => {
    const markdown = '```javascript\nconst test = 1\n```'

    let highlight: jest.Mock
    let md: markdownIt
    let marpHighlighter: jest.SpyInstance

    beforeEach(() => {
      marpHighlighter = jest.spyOn(Marp.prototype, 'highlighter')
      highlight = jest.fn(() => 'baseHighlight')
      md = extendMarkdownIt(new markdownIt({ highlight }))
    })

    it('uses original highlighter when Marp is disabled', () => {
      md.render(markdown)

      expect(highlight).toBeCalled()
      expect(marpHighlighter).not.toBeCalled()
    })

    it('uses Marp highlighter when Marp is enabled', () => {
      md.render(marpMd(markdown))

      expect(highlight).not.toBeCalled()
      expect(marpHighlighter).toReturnWith(expect.stringContaining('hljs'))
    })

    it('supports mermaid plugin by other VSCode plugin', () => {
      const html = md.render(marpMd('```mermaid\n>>\n```'))

      expect(marpHighlighter).toReturnWith('')
      expect(html).toContain('<div class="mermaid">&gt;&gt;')
    })

    it('passes code through when specified unknown language', () => {
      const html = md.render(marpMd('```unknownlang\nv => 5\n```'))

      expect(marpHighlighter).toReturnWith('')
      expect(html).toContain('<code class="language-unknownlang">')
    })
  })
})
