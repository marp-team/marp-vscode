import fs from 'fs'
import path from 'path'
import { Marp } from '@marp-team/marp-core'
import axios from 'axios'
import cheerio from 'cheerio'
import dedent from 'dedent'
import markdownIt from 'markdown-it'
import { Uri, commands, workspace } from 'vscode'

jest.mock('fs')
jest.mock('axios')
jest.mock('vscode')

let themes: typeof import('./themes')['default']

const extension = (): typeof import('./extension') => {
  let ext

  jest.isolateModules(() => {
    ext = require('./extension') // Shut up cache
    themes = require('./themes').default
  })

  return ext
}

const setConfiguration: (conf?: object) => void = (workspace as any)
  ._setConfiguration

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
    describe('Custom theme', () => {
      const marpCore = (markdown: string = ''): Marp => {
        const { extendMarkdownIt, marpVscode } = extension()
        const md = new markdownIt()

        extendMarkdownIt(md).render(marpMd(markdown))
        return md[marpVscode]
      }

      it('prevents override built-in theme', () => {
        expect(() => marpCore().themeSet.add('/* @theme default */')).toThrow()
        expect(() => marpCore().themeSet.add('/* @theme gaia */')).toThrow()
        expect(() => marpCore().themeSet.add('/* @theme uncover */')).toThrow()
      })

      it('works size global directive correctly', () =>
        expect(() => marpCore('<!-- size: 4:3 -->')).not.toThrow())
    })

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
          extension().extendMarkdownIt(new markdownIt()).render(markdown)
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

    describe('markdown.marp.themes', () => {
      const baseDir = '/test/path'
      const css = '/* @theme example */'
      const themeURL = 'https://example.com/test.css'

      beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation()
        jest.spyOn(console, 'log').mockImplementation()
      })

      it('registers pre-loaded themes from URL defined in configuration', async () => {
        const axiosGet = jest
          .spyOn(axios, 'get')
          .mockResolvedValue({ data: css })

        setConfiguration({ 'markdown.marp.themes': [themeURL] })

        const markdown = md()
        await Promise.all(themes.loadStyles(Uri.parse('.')))

        expect(axiosGet).toBeCalledWith(themeURL, expect.any(Object))
        expect(markdown.render(marpMd('<!--theme: example-->'))).toContain(css)
      })

      it('registers pre-loaded themes from specified path defined in configuration', async () => {
        const fsReadFile = jest
          .spyOn(fs, 'readFile')
          .mockImplementation((_, cb) => cb(null, Buffer.from(css)))

        setConfiguration({ 'markdown.marp.themes': ['./test.css'] })

        const markdown = md()
        const mdBody = marpMd('<!--theme: example-->')
        ;(workspace as any).textDocuments = [
          {
            languageId: 'markdown',
            getText: () => mdBody,
            uri: Uri.parse(baseDir),
            fileName: path.resolve(baseDir, 'test.css'),
          } as any,
        ]

        await Promise.all(themes.loadStyles(Uri.parse(baseDir)))

        expect(fsReadFile).toBeCalledWith(
          path.resolve(baseDir, './test.css'),
          expect.any(Function)
        )
        expect(markdown.render(mdBody)).toContain(css)
      })

      it('cannot traverse theme CSS path to parent directory as same as markdown.styles', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockImplementation((_, cb) => cb(null, Buffer.from(css)))

        setConfiguration({ 'markdown.marp.themes': ['../test.css'] })

        const markdown = md()
        markdown.normalizeLink = (url) => path.resolve(baseDir, url)

        await Promise.all(themes.loadStyles(Uri.parse(baseDir)))
        expect(markdown.render(marpMd('<!--theme: example-->'))).not.toContain(
          css
        )
      })

      it('cannot override built-in themes by custom theme', async () => {
        jest
          .spyOn(axios, 'get')
          .mockResolvedValue({ data: '/*\n@theme default\n@custom theme\n*/' })

        setConfiguration({ 'markdown.marp.themes': [themeURL] })

        const markdown = md()
        await Promise.all(themes.loadStyles(Uri.parse('.')))

        expect(
          markdown.render(marpMd('<!-- theme: default -->'))
        ).not.toContain('@custom theme')
      })
    })
  })
})
