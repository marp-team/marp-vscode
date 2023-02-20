/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'path'
import { TextEncoder } from 'util'
import { Marp } from '@marp-team/marp-core'
import dedent from 'dedent'
import markdownIt from 'markdown-it'
import * as nodeFetch from 'node-fetch'
import { Memento, Uri, commands, workspace, env } from 'vscode'

jest.mock('node-fetch')
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

const setConfiguration: (conf?: Record<string, unknown>) => void = (
  workspace as any
)._setConfiguration

const createMemento = (): Memento => (env as any)._createMemento()

describe('#activate', () => {
  const extContext = (): any => ({
    subscriptions: { push: jest.fn() },
    globalState: createMemento(),
  })

  it('contains #extendMarkdownIt', () => {
    const { activate, extendMarkdownIt } = extension()

    expect(activate(extContext())).toEqual(
      expect.objectContaining({ extendMarkdownIt })
    )
  })

  it('refreshes Markdown preview when affected configuration has changed', () => {
    extension().activate(extContext())

    const onDidChgConf = workspace.onDidChangeConfiguration as jest.Mock
    expect(onDidChgConf).toHaveBeenCalledWith(expect.any(Function))

    for (const [callback] of onDidChgConf.mock.calls) {
      callback({
        affectsConfiguration: jest.fn(
          (conf) => conf === 'markdown.marp.breaks'
        ),
      })
    }

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'markdown.preview.refresh'
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
        const html = extension()
          .extendMarkdownIt(new markdownIt())
          .render(markdown)

        expect(html).not.toContain('<div id="__marp-vscode">')
        expect(html).not.toContain('<style id="__marp-vscode-style">')
        expect(html).not.toContain('svg')
        expect(html).not.toContain('img')
      }
    })

    it('uses Marp engine when enabled marp front-matter', () => {
      const html = extension()
        .extendMarkdownIt(new markdownIt())
        .render(marpMd(baseMd))

      expect(html).toContain('<div id="__marp-vscode">')
      expect(html).toContain('<style id="__marp-vscode-style">')
      expect(html).toContain('svg')
      expect(html).toContain('img')
    })
  })

  describe('Plugins', () => {
    describe('Custom theme', () => {
      const marpCore = (markdown = ''): Marp => {
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
        const doc = new DOMParser().parseFromString(
          extension().extendMarkdownIt(new markdownIt()).render(markdown),
          'text/html'
        )

        // Slide wrappers
        const wrappers = doc.querySelectorAll<HTMLElement>(
          '[data-marp-vscode-slide-wrapper].code-line'
        )
        expect(wrappers[0].dataset.line).toBe('0')
        expect(wrappers[1].dataset.line).toBe('8')

        // Contents
        expect(doc.querySelector<HTMLElement>('h1')?.dataset.line).toBe('4')
        expect(doc.querySelector<HTMLElement>('p')?.dataset.line).toBe('6')
        expect(doc.querySelector<HTMLElement>('h2')?.dataset.line).toBe('10')
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

      describe('when the current workspace is untrusted', () => {
        let isTrustedMock: jest.SpyInstance

        beforeEach(() => {
          isTrustedMock = jest
            .spyOn(workspace, 'isTrusted', 'get')
            .mockImplementation(() => false)
        })

        afterEach(() => isTrustedMock?.mockRestore())

        it('does not render HTML elements even if enabled', () => {
          setConfiguration({ 'markdown.marp.enableHtml': true })

          const html = md().render(marpMd('<b>Hi</b>'))
          expect(html).not.toContain('<b>Hi</b>')
        })
      })
    })

    describe('markdown.marp.mathTypesetting', () => {
      it('renders math syntax in KaTeX when setting "katex"', () => {
        setConfiguration({ 'markdown.marp.mathTypesetting': 'katex' })

        const html = md().render(marpMd('$a=b$'))
        expect(html).toContain('katex')
        expect(html).not.toContain('MathJax')
      })

      it('renders math syntax in MathJax when setting "mathjax"', () => {
        setConfiguration({ 'markdown.marp.mathTypesetting': 'mathjax' })

        const html = md().render(marpMd('$a=b$'))
        expect(html).not.toContain('katex')
        expect(html).toContain('MathJax')
      })

      it('disables math syntax when setting "off"', () => {
        setConfiguration({ 'markdown.marp.mathTypesetting': 'off' })

        const html = md().render(marpMd('$a=b$'))
        expect(html).toContain('$a=b$')
        expect(html).not.toMatch(/katex/i)
        expect(html).not.toMatch(/mathjax/i)
      })
    })

    describe('markdown.marp.themes', () => {
      const baseDir = '/test/path'
      const css = '/* @theme example */'
      const themeURL = 'https://example.com/test.css'

      let errorMock: jest.SpyInstance
      let logMock: jest.SpyInstance

      beforeEach(() => {
        errorMock = jest.spyOn(console, 'error').mockImplementation()
        logMock = jest.spyOn(console, 'log').mockImplementation()
      })

      afterEach(() => {
        errorMock?.mockRestore()
        logMock?.mockRestore()
      })

      it('registers pre-loaded themes from URL defined in configuration', async () => {
        const fetch = jest
          .spyOn(nodeFetch, 'default')
          .mockResolvedValue({ ok: true, text: async () => css } as any)

        try {
          setConfiguration({ 'markdown.marp.themes': [themeURL] })

          const markdown = md()
          await Promise.all(themes.loadStyles(Uri.parse('.')))

          expect(fetch).toHaveBeenCalledWith(themeURL, expect.any(Object))
          expect(themes.observedThemes.size).toBe(1)
          expect(markdown.render(marpMd('<!--theme: example-->'))).toContain(
            css
          )

          // Watcher events will not register
          const [theme] = themes.observedThemes.values()
          expect(theme.onDidChange).toBeUndefined()
          expect(theme.onDidDelete).toBeUndefined()

          // Clean up
          themes.dispose()
          expect(themes.observedThemes.size).toBe(0)
        } finally {
          fetch.mockRestore()
        }
      })

      it('registers pre-loaded themes from specified path defined in configuration', async () => {
        const fsReadFile = jest
          .spyOn(workspace.fs, 'readFile')
          .mockResolvedValue(new TextEncoder().encode(css))

        try {
          setConfiguration({ 'markdown.marp.themes': ['./test.css'] })

          const markdown = md()
          const mdBody = marpMd('<!--theme: example-->')
          const mdFileName = path.resolve(baseDir, 'test.css')
          ;(workspace as any).textDocuments = [
            {
              languageId: 'markdown',
              getText: () => mdBody,
              uri: Uri.file(mdFileName),
              fileName: mdFileName,
            } as any,
          ]

          await Promise.all(themes.loadStyles(Uri.file(baseDir)))

          expect(fsReadFile).toHaveBeenCalledWith(
            expect.objectContaining({
              fsPath: path.resolve(baseDir, './test.css'),
            })
          )
          expect(themes.observedThemes.size).toBe(1)
          expect(markdown.render(mdBody)).toContain(css)

          // Theme object
          const [theme] = themes.observedThemes.values()
          expect(theme.onDidChange).toHaveProperty('dispose')
          expect(theme.onDidDelete).toHaveProperty('dispose')

          // Clean up
          themes.dispose()
          expect(theme.onDidChange?.dispose).toHaveBeenCalled()
          expect(theme.onDidDelete?.dispose).toHaveBeenCalled()
          expect(themes.observedThemes.size).toBe(0)
        } finally {
          fsReadFile.mockRestore()
        }
      })

      it('cannot traverse theme CSS path to parent directory as same as markdown.styles', async () => {
        const readFileMock = jest
          .spyOn(workspace.fs, 'readFile')
          .mockResolvedValue(new TextEncoder().encode(css))

        try {
          setConfiguration({ 'markdown.marp.themes': ['../test.css'] })

          const markdown = md()
          markdown.normalizeLink = (url) => path.resolve(baseDir, url)

          await Promise.all(themes.loadStyles(Uri.parse(baseDir)))
          expect(
            markdown.render(marpMd('<!--theme: example-->'))
          ).not.toContain(css)
        } finally {
          readFileMock.mockRestore()
        }
      })

      it('cannot override built-in themes by custom theme', async () => {
        const fetchMock = jest.spyOn(nodeFetch, 'default').mockResolvedValue({
          ok: true,
          text: async () => '/*\n@theme default\n@custom theme\n*/',
        } as any)

        try {
          setConfiguration({ 'markdown.marp.themes': [themeURL] })

          const markdown = md()
          await Promise.all(themes.loadStyles(Uri.parse('.')))

          expect(
            markdown.render(marpMd('<!-- theme: default -->'))
          ).not.toContain('@custom theme')
        } finally {
          fetchMock.mockRestore()
        }
      })

      describe('when the current workspace belongs to the virtual file system', () => {
        const vfsUri = Uri.parse('vscode-vfs://dummy.host/path/to/workspace')

        let getWorkspaceFolderMock: jest.SpyInstance

        beforeEach(() => {
          getWorkspaceFolderMock = jest
            .spyOn(workspace, 'getWorkspaceFolder')
            .mockReturnValue({ name: 'vfs', index: 0, uri: vfsUri })
        })

        afterEach(() => {
          getWorkspaceFolderMock?.mockRestore()
        })

        it('resolves theme CSS through VS Code FileSystem API', async () => {
          const wsFsReadfile = jest
            .spyOn(workspace.fs, 'readFile')
            .mockResolvedValue(new TextEncoder().encode(css))

          try {
            const mdBody = marpMd('<!--theme: example-->')

            setConfiguration({ 'markdown.marp.themes': ['example.css'] })
            ;(workspace as any).textDocuments = [
              {
                languageId: 'markdown',
                getText: () => mdBody,
                uri: Uri.parse(vfsUri.path + '/test.md'),
                fileName: vfsUri.path + '/test.md',
              } as any,
            ]

            const markdown = md()
            await Promise.all(themes.loadStyles(vfsUri))

            expect(wsFsReadfile).toHaveBeenCalledWith(
              expect.objectContaining({ scheme: 'vscode-vfs' })
            )
            expect(markdown.render(mdBody)).toContain(css)
          } finally {
            wsFsReadfile.mockRestore()
          }
        })
      })
    })

    describe('markdown.marp.outlineExtension', () => {
      const markdown = dedent`
        ---
        marp: true
        ---

        1

        ---

        2
      `

      it('adds hidden heading token marked as zero-level if enabled', () => {
        setConfiguration({ 'markdown.marp.outlineExtension': true })

        const parsed = md().parse(markdown)
        const hiddenHeadings = parsed.filter(
          (t) => t.type === 'heading_open' && t.level === 0 && t.hidden
        )

        expect(hiddenHeadings).toHaveLength(2)
        expect(hiddenHeadings[0].map[0]).toBe(0)
        expect(hiddenHeadings[1].map[0]).toBe(6)

        // headingDivider directive
        const headingDivider = md().parse(dedent`
          ---
          marp: true
          headingDivider: 2
          ---

          # 1

          ## 2

          ### 3

          ## 4
        `)
        const hiddenHeadingDividers = headingDivider.filter(
          (t) => t.type === 'heading_open' && t.level === 0 && t.hidden
        )

        expect(hiddenHeadingDividers).toHaveLength(3)
        expect(hiddenHeadingDividers[0].map[0]).toBe(0)
        expect(hiddenHeadingDividers[1].map[0]).toBe(7)
        expect(hiddenHeadingDividers[2].map[0]).toBe(11)
      })

      it('does not add zero-level heading token if disabled', () => {
        setConfiguration({ 'markdown.marp.outlineExtension': false })

        const parsed = md().parse(markdown)
        const hiddenHeadings = parsed.filter(
          (t) => t.type === 'heading_open' && t.level === 0 && t.hidden
        )

        expect(hiddenHeadings).toHaveLength(0)
      })
    })
  })
})
