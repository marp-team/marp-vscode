/** @jest-environment jsdom */
import path from 'node:path'
import { TextEncoder } from 'node:util'
import { Marp } from '@marp-team/marp-core'
import dedent from 'dedent'
import markdownIt from 'markdown-it'
import * as nodeFetch from 'node-fetch'
import {
  Memento,
  Uri,
  commands,
  window,
  workspace,
  env,
  Diagnostic,
} from 'vscode'
import type { Disposable } from 'vscode'
import { eventType } from './preview/overflow-tracker'

jest.mock('node-fetch')
jest.mock('vscode')
jest.mock('./observer', () => ({
  incompatiblePreviewExtensionsObserver: jest.fn(),
}))

let themes: (typeof import('./themes'))['default']
let previewDiagnosticsCollection: typeof import('./diagnostics/preview').collection

const extension = (): typeof import('./extension') => {
  let ext

  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports -- Shut up cache */
    ext = require('./extension')
    themes = require('./themes').default
    previewDiagnosticsCollection = require('./diagnostics/preview').collection
    /* eslint-enable @typescript-eslint/no-require-imports */
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

  it('contains extendMarkdownIt with a return value of #getExtendMarkdownIt', () => {
    const ext = extension()
    const extendMarkdownItMock = jest.fn()

    jest.spyOn(ext, 'getExtendMarkdownIt').mockReturnValue(extendMarkdownItMock)

    expect(ext.activate(extContext())).toEqual(
      expect.objectContaining({ extendMarkdownIt: extendMarkdownItMock }),
    )
  })

  it('refreshes Markdown preview when affected configuration has changed', () => {
    extension().activate(extContext())

    const onDidChgConf = workspace.onDidChangeConfiguration as jest.Mock
    expect(onDidChgConf).toHaveBeenCalledWith(expect.any(Function))

    for (const [callback] of onDidChgConf.mock.calls) {
      callback({
        affectsConfiguration: jest.fn(
          (conf) => conf === 'markdown.marp.breaks',
        ),
      })
    }

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'markdown.preview.refresh',
    )
  })
})

describe('#getExtendMarkdownIt', () => {
  const marpMd = (md: string) => `---\nmarp: true\n---\n\n${md}`
  const subscriptions = []

  it('returns a function for extending MarkdownIt', () => {
    const extendMarkdownIt = extension().getExtendMarkdownIt({ subscriptions })
    expect(extendMarkdownIt).toBeInstanceOf(Function)
  })

  describe('Marp Core', () => {
    const baseMd = '# Hello :wave:\n\n<!-- header: Hi -->'

    it('uses default engine when not enabled marp front-matter', () => {
      const confusingMd =
        '---\nmarp: false\n---\n\n```markdown\n---\nmarp: true\n---\n```'

      for (const markdown of [baseMd, confusingMd]) {
        const html = extension()
          .getExtendMarkdownIt({ subscriptions })(new markdownIt())
          .render(markdown)

        expect(html).not.toContain('<div id="__marp-vscode">')
        expect(html).not.toContain('<style id="__marp-vscode-style">')
        expect(html).not.toContain('svg')
        expect(html).not.toContain('img')
      }
    })

    it('uses Marp engine when enabled marp front-matter', () => {
      const html = extension()
        .getExtendMarkdownIt({ subscriptions })(new markdownIt())
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
        const { getExtendMarkdownIt, marpVscode } = extension()
        const md = new markdownIt()

        getExtendMarkdownIt({ subscriptions })(md).render(marpMd(markdown))
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
          extension()
            .getExtendMarkdownIt({ subscriptions })(new markdownIt())
            .render(markdown),
          'text/html',
        )

        // Slide wrappers
        const wrappers = doc.querySelectorAll<HTMLElement>(
          '[data-marp-vscode-slide-wrapper].code-line',
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
    const md = (opts = {}) =>
      extension().getExtendMarkdownIt({ subscriptions })(new markdownIt(opts))

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

    describe('markdown.marp.html', () => {
      it('does not render not allowed HTML elements when the setting is "off"', () => {
        setConfiguration({ 'markdown.marp.html': 'off' })

        const html = md().render(marpMd('<script>console.log("Hi")</script>'))
        expect(html).not.toContain('<script>console.log("Hi")</script>')
      })

      it(`does not render Marp Core allowed HTML elements when the setting is "off"`, () => {
        setConfiguration({ 'markdown.marp.html': 'off' })

        const html = md().render(marpMd('line<br>break'))
        expect(html).not.toContain('line<br />break')
      })

      it('does not render not allowed HTML elements when the setting is "default"', () => {
        setConfiguration({ 'markdown.marp.html': 'default' })

        const html = md().render(marpMd('<script>console.log("Hi")</script>'))
        expect(html).not.toContain('<script>console.log("Hi")</script>')
      })

      it(`allows Marp Core's allowed HTML elements even if the setting is "default"`, () => {
        setConfiguration({ 'markdown.marp.html': 'default' })

        const html = md().render(marpMd('line<br>break'))
        expect(html).toContain('line<br />break')
      })

      it('renders not allowed HTML elements when the setting is "all"', () => {
        setConfiguration({ 'markdown.marp.html': 'all' })

        const html = md().render(marpMd('<script>console.log("Hi")</script>'))
        expect(html).toContain('<script>console.log("Hi")</script>')
      })

      describe('when the current workspace is untrusted', () => {
        let isTrustedMock: jest.SpyInstance

        beforeEach(() => {
          isTrustedMock = jest
            .spyOn(workspace, 'isTrusted', 'get')
            .mockImplementation(() => false)
        })

        afterEach(() => isTrustedMock?.mockRestore())

        it('does not render not allowed HTML elements even the setting is "all"', () => {
          setConfiguration({ 'markdown.marp.html': 'all' })

          const br = md().render(marpMd('line<br>break'))
          expect(br).not.toContain('line<br />break')

          const script = md().render(
            marpMd('<script>console.log("Hi")</script>'),
          )
          expect(script).not.toContain('<script>console.log("Hi")</script>')
        })
      })
    })

    describe('[Deprecated] markdown.marp.enableHtml', () => {
      it('renders not allowed HTML elements when the value is true', () => {
        setConfiguration({ 'markdown.marp.enableHtml': true })

        const html = md().render(marpMd('<script>console.log("Hi")</script>'))
        expect(html).toContain('<script>console.log("Hi")</script>')
      })

      it('prefers explicit "markdown.marp.html" setting than "markdown.marp.enableHtml" setting', () => {
        setConfiguration({
          'markdown.marp.html': 'off',
          'markdown.marp.enableHtml': true,
        })

        const html = md().render(marpMd('<script>console.log("Hi")</script>'))
        expect(html).not.toContain('<script>console.log("Hi")</script>')
      })

      it('shows deprecation warning while rendering if "markdown.marp.html" is the default value and "markdown.marp.enableHtml" is enabled', () => {
        setConfiguration({
          'markdown.marp.html': 'default',
          'markdown.marp.enableHtml': true,
        })

        md().render(marpMd('<script>console.log("Hi")</script>'))
        expect(window.showWarningMessage).toHaveBeenCalledWith(
          expect.stringContaining(
            'The setting "markdown.marp.enableHtml" is deprecated',
          ),
          expect.anything(),
        )
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
            css,
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
            }),
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
            markdown.render(marpMd('<!--theme: example-->')),
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
            markdown.render(marpMd('<!-- theme: default -->')),
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
              expect.objectContaining({ scheme: 'vscode-vfs' }),
            )
            expect(markdown.render(mdBody)).toContain(css)
          } finally {
            wsFsReadfile.mockRestore()
          }
        })
      })
    })

    describe('Managing rendered WebView', () => {
      const createVSCodeMdFeatures = () => {
        const onDidReceiveMessage: Disposable = { dispose: jest.fn() }
        const webviewPanel = {
          webview: {
            onDidReceiveMessage: jest.fn().mockReturnValue(onDidReceiveMessage),
          },
          onDidDispose: jest.fn(),
        }

        return {
          currentDocument: Uri.parse('untitled:untitled-1'),
          onDidReceiveMessage,
          resourceProvider: { _webviewPanel: webviewPanel },
          webviewPanel,
        }
      }

      it('registers event receiver when a rendered webview was detected from resource provider in markdown-it env', () => {
        const {
          currentDocument,
          onDidReceiveMessage,
          webviewPanel,
          resourceProvider,
        } = createVSCodeMdFeatures()

        const subscriptions = []
        const md = extension().getExtendMarkdownIt({ subscriptions })(
          new markdownIt(),
        )

        md.render('Test')
        expect(subscriptions).toHaveLength(0)
        expect(webviewPanel.webview.onDidReceiveMessage).not.toHaveBeenCalled()
        expect(webviewPanel.onDidDispose).not.toHaveBeenCalled()

        md.render('Test', { currentDocument, resourceProvider })
        expect(subscriptions).toHaveLength(1)
        expect(webviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled()
        expect(webviewPanel.onDidDispose).toHaveBeenCalled()

        // Avoid double registration
        md.render('Test', { currentDocument, resourceProvider })
        expect(subscriptions).toHaveLength(1)
        expect(webviewPanel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(
          1,
        )
        expect(webviewPanel.onDidDispose).toHaveBeenCalledTimes(1)

        // Dispose webview
        const mockedOnDidDispose = jest.mocked(webviewPanel.onDidDispose)
        const [disposeCallback] = mockedOnDidDispose.mock.calls[0]
        disposeCallback()
        expect(onDidReceiveMessage.dispose).toHaveBeenCalled()

        // After disposed, WebView can be re-registered
        mockedOnDidDispose.mockClear()
        subscriptions.splice(0, subscriptions.length)

        md.render('Test', { currentDocument, resourceProvider })
        expect(subscriptions).toHaveLength(1)
        expect(webviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled()
        expect(webviewPanel.onDidDispose).toHaveBeenCalled()
      })

      describe('markdown.marp.diagnostics.slideContentOverflow', () => {
        it('sets diagnostics if overflow tracker event received and configuration was enabled', () => {
          setConfiguration({
            'markdown.marp.diagnostics.slideContentOverflow': true,
          })

          const { currentDocument, webviewPanel, resourceProvider } =
            createVSCodeMdFeatures()

          const md = extension().getExtendMarkdownIt({ subscriptions: [] })(
            new markdownIt(),
          )

          // If Marp rendering was disabled, diagnostics always set as undefined
          md.render('Test', { currentDocument, resourceProvider })
          expect(webviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled()
          expect(previewDiagnosticsCollection.set).toHaveBeenCalledWith(
            currentDocument,
            undefined,
          )

          // Simulate overflow tracker event from preview
          const [receiveMessageCallback] = jest.mocked(
            webviewPanel.webview.onDidReceiveMessage,
          ).mock.calls[0]

          jest.mocked(previewDiagnosticsCollection.set).mockClear()
          receiveMessageCallback({
            type: eventType,
            overflowElements: [
              { startLine: 0, endLine: 1 },
              { startLine: 2, endLine: 4 },
            ],
          })

          expect(previewDiagnosticsCollection.set).toHaveBeenCalledWith(
            currentDocument,
            [expect.any(Diagnostic), expect.any(Diagnostic)],
          )
        })

        it('does not set diagnostics even if overflow tracker event received but configuration was disabled', () => {
          setConfiguration({
            'markdown.marp.diagnostics.slideContentOverflow': false,
          })

          const { currentDocument, webviewPanel, resourceProvider } =
            createVSCodeMdFeatures()

          const md = extension().getExtendMarkdownIt({ subscriptions: [] })(
            new markdownIt(),
          )

          md.render('Test', { currentDocument, resourceProvider })
          expect(webviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled()

          // Simulate overflow tracker event from preview
          const [receiveMessageCallback] = jest.mocked(
            webviewPanel.webview.onDidReceiveMessage,
          ).mock.calls[0]

          jest.mocked(previewDiagnosticsCollection.set).mockClear()
          receiveMessageCallback({
            type: eventType,
            overflowElements: [
              { startLine: 0, endLine: 1 },
              { startLine: 2, endLine: 4 },
            ],
          })

          expect(previewDiagnosticsCollection.set).toHaveBeenCalledWith(
            currentDocument,
            undefined, // No diagnostics set
          )
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
          (t) => t.type === 'heading_open' && t.level === 0 && t.hidden,
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
          (t) => t.type === 'heading_open' && t.level === 0 && t.hidden,
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
          (t) => t.type === 'heading_open' && t.level === 0 && t.hidden,
        )

        expect(hiddenHeadings).toHaveLength(0)
      })
    })
  })
})
