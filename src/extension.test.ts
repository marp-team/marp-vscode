/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'path'
import { TextEncoder } from 'util'
import { Marp } from '@marp-team/marp-core'
import dedent from 'dedent'
import markdownIt from 'markdown-it'
import * as nodeFetch from 'node-fetch'
import {
  Memento,
  MessageItem,
  Uri,
  commands,
  window,
  workspace,
  env,
} from 'vscode'

jest.mock('node-fetch')
jest.mock('vscode')

let themes: typeof import('./themes')['default']
let dontShowAgainItem: MessageItem

const extension = (): typeof import('./extension') => {
  let ext

  jest.isolateModules(() => {
    ext = require('./extension') // Shut up cache
    themes = require('./themes').default
    dontShowAgainItem = require('./web/alert').dontShowAgainItem
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

  it('does not show alert modal', () => {
    extension().activate(extContext())
    expect(window.showErrorMessage).not.toHaveBeenCalled()
  })

  describe('when running Web extension', () => {
    let previousAppHost: string

    beforeEach(() => {
      previousAppHost = env.appHost
      ;(env as any).appHost = 'web'
    })

    afterEach(() => {
      ;(env as any).appHost = previousAppHost
    })

    it('shows alert modal', () => {
      extension().activate(extContext())
      expect(window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Marp for VS Code extension on the web'),
        expect.objectContaining({ modal: true }),
        expect.objectContaining({ title: expect.any(String) }),
        expect.objectContaining({ title: expect.any(String) })
      )
    })

    it(`does not show alert modal again if reacted to "Don't show again"`, async () => {
      const { activate } = extension()
      const showErrorMessageMock = window.showErrorMessage as jest.Mock
      showErrorMessageMock.mockResolvedValueOnce(dontShowAgainItem)

      // React to "Don't show again"
      const context = extContext()
      activate(context)

      expect(window.showErrorMessage).toHaveBeenCalledTimes(1)
      await showErrorMessageMock.mock.results[0].value

      // Activate extension again, with already reacted globalState
      activate({ ...extContext(), globalState: context.globalState })
      expect(window.showErrorMessage).toHaveBeenCalledTimes(1)
    })
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

        // SVG slides
        const svg = doc.querySelectorAll<SVGElement>('svg.code-line')
        expect(svg[0].dataset.line).toBe('0')
        expect(svg[1].dataset.line).toBe('8')

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
        beforeEach(() => {
          jest
            .spyOn(workspace, 'isTrusted', 'get')
            .mockImplementation(() => false)
        })

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

      beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation()
        jest.spyOn(console, 'log').mockImplementation()
      })

      it('registers pre-loaded themes from URL defined in configuration', async () => {
        const fetch = jest
          .spyOn(nodeFetch, 'default')
          .mockResolvedValue({ ok: true, text: async () => css } as any)

        setConfiguration({ 'markdown.marp.themes': [themeURL] })

        const markdown = md()
        await Promise.all(themes.loadStyles(Uri.parse('.')))

        expect(fetch).toHaveBeenCalledWith(themeURL, expect.any(Object))
        expect(themes.observedThemes.size).toBe(1)
        expect(markdown.render(marpMd('<!--theme: example-->'))).toContain(css)

        // Watcher events will not register
        const [theme] = themes.observedThemes.values()
        expect(theme.onDidChange).toBeUndefined()
        expect(theme.onDidDelete).toBeUndefined()

        // Clean up
        themes.dispose()
        expect(themes.observedThemes.size).toBe(0)
      })

      it('registers pre-loaded themes from specified path defined in configuration', async () => {
        const fsReadFile = jest
          .spyOn(workspace.fs, 'readFile')
          .mockResolvedValue(new TextEncoder().encode(css))

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
      })

      it('cannot traverse theme CSS path to parent directory as same as markdown.styles', async () => {
        jest
          .spyOn(workspace.fs, 'readFile')
          .mockResolvedValue(new TextEncoder().encode(css))

        setConfiguration({ 'markdown.marp.themes': ['../test.css'] })

        const markdown = md()
        markdown.normalizeLink = (url) => path.resolve(baseDir, url)

        await Promise.all(themes.loadStyles(Uri.parse(baseDir)))
        expect(markdown.render(marpMd('<!--theme: example-->'))).not.toContain(
          css
        )
      })

      it('cannot override built-in themes by custom theme', async () => {
        jest.spyOn(nodeFetch, 'default').mockResolvedValue({
          ok: true,
          text: async () => '/*\n@theme default\n@custom theme\n*/',
        } as any)

        setConfiguration({ 'markdown.marp.themes': [themeURL] })

        const markdown = md()
        await Promise.all(themes.loadStyles(Uri.parse('.')))

        expect(
          markdown.render(marpMd('<!-- theme: default -->'))
        ).not.toContain('@custom theme')
      })

      describe('when the current workspace belongs to the virtual file system', () => {
        const vfsUri = Object.assign(Uri.parse(baseDir), {
          scheme: 'vscode-vfs',
          path: 'vscode-vfs://dummy.host/path/to/workspace',
          fsPath: '/vscode-vfs/dummy.host/path/to/workspace',
          toString() {
            return this.path
          },
        })

        beforeEach(() => {
          jest
            .spyOn(workspace, 'getWorkspaceFolder')
            .mockReturnValue({ name: 'vfs', index: 0, uri: vfsUri })
        })

        it('resolves theme CSS through VS Code FileSystem API', async () => {
          const wsFsReadfile = jest
            .spyOn(workspace.fs, 'readFile')
            .mockResolvedValue(new TextEncoder().encode(css))

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
            expect.objectContaining({
              path: expect.stringContaining('vscode-vfs://'),
            })
          )
          expect(markdown.render(mdBody)).toContain(css)
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

  describe('Patch for VS Code', () => {
    const md = extension().extendMarkdownIt(new markdownIt('commonmark'))

    beforeEach(() => {
      jest.spyOn(console, 'debug').mockImplementation()
    })

    it('applys patch to VS Code preview logic through renderer env', () => {
      class ContentProvider {
        getScripts() {
          return `
<script async
  src="https://example.com/vscode-builtin/script.js"
  nonce="1234567890"
></script>
<script async
  src="https://example.com/marp-vscode/preview.js"
  nonce="0987654321"
></script>
`.trim()
        }
      }

      const _contentProvider = new ContentProvider()
      const resourceProvider = { _contentProvider }

      // Apply patch by calling render method
      md.render('test', { resourceProvider })

      expect(_contentProvider.getScripts()).toMatchInlineSnapshot(`
        "<script 
          src=\\"https://example.com/marp-vscode/preview.js\\"
          nonce=\\"0987654321\\"
        ></script>
        <script async
          src=\\"https://example.com/vscode-builtin/script.js\\"
          nonce=\\"1234567890\\"
        ></script>"
      `)
    })

    it('emits warning if happened some trouble while patching', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation()

      md.render('test', { resourceProvider: {} })
      expect(warn).toHaveBeenCalled()
    })
  })
})
