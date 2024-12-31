import * as nodeFetch from 'node-fetch'
import { Uri, workspace } from 'vscode'
import * as option from './option'
import { textEncoder } from './utils'

jest.mock('node-fetch')
jest.mock('vscode')

const setConfiguration: (conf?: Record<string, unknown>) => void = (
  workspace as any
)._setConfiguration

describe('Option', () => {
  describe('#marpCoreOptionForCLI', () => {
    const subject: (...args: any[]) => Promise<any> =
      option.marpCoreOptionForCLI

    const untitledUri = Uri.parse('untitled:untitled')

    it('returns basic options', async () => {
      const opts = await subject({ uri: untitledUri })

      expect(opts.allowLocalFiles).toBe(true)
      expect(opts.pdfNotes).toBeUndefined()

      const custom = await subject(
        { uri: untitledUri },
        { allowLocalFiles: false, pdfNotes: true },
      )

      expect(custom.allowLocalFiles).toBe(false)
      expect(custom.pdfNotes).toBe(true)
    })

    it('enables HTML by preference', async () => {
      setConfiguration({ 'markdown.marp.enableHtml': true })
      expect((await subject({ uri: untitledUri })).html).toBe(true)

      setConfiguration({ 'markdown.marp.enableHtml': false })
      expect((await subject({ uri: untitledUri })).html).toBeUndefined()
    })

    it('enables breaks in markdown conversion by preference', async () => {
      setConfiguration({ 'markdown.marp.breaks': 'on' })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks,
      ).toBe(true)

      setConfiguration({ 'markdown.marp.breaks': 'off' })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks,
      ).toBe(false)

      // inherit option (markdown.preview.breaks)
      setConfiguration({
        'markdown.marp.breaks': 'inherit',
        'markdown.preview.breaks': true,
      })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks,
      ).toBe(true)

      setConfiguration({
        'markdown.marp.breaks': 'inherit',
        'markdown.preview.breaks': false,
      })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks,
      ).toBe(false)
    })

    it('enables typographer by preference', async () => {
      expect(
        (await subject({ uri: untitledUri })).options.markdown.typographer,
      ).toBeUndefined()

      setConfiguration({ 'markdown.preview.typographer': true })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.typographer,
      ).toBe(true)

      setConfiguration({ 'markdown.preview.typographer': false })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.typographer,
      ).toBe(false)
    })

    it('sets pdfOutlines option in response to the preference', async () => {
      const pdfOutlines = async () =>
        (await subject({ uri: untitledUri })).pdfOutlines

      expect(await pdfOutlines()).toBe(false)

      setConfiguration({ 'markdown.marp.pdf.outlines': 'pages' })
      expect(await pdfOutlines()).toStrictEqual({
        pages: true,
        headings: false,
      })

      setConfiguration({ 'markdown.marp.pdf.outlines': 'headings' })
      expect(await pdfOutlines()).toStrictEqual({
        pages: false,
        headings: true,
      })

      setConfiguration({ 'markdown.marp.pdf.outlines': 'both' })
      expect(await pdfOutlines()).toStrictEqual({
        pages: true,
        headings: true,
      })
    })

    describe('when targeted document belongs to workspace', () => {
      const css = '/* @theme test */'

      let getWorkspaceFolderMock: jest.SpyInstance
      let logMock: jest.SpyInstance
      let fetchMock: jest.SpyInstance

      beforeEach(() => {
        // Workspace
        getWorkspaceFolderMock = jest
          .spyOn(workspace, 'getWorkspaceFolder')
          .mockImplementationOnce((): any => ({
            uri: { scheme: 'file', fsPath: '/workspace/' },
          }))

        // Theme CSS
        logMock = jest.spyOn(console, 'log').mockImplementation()
        fetchMock = jest
          .spyOn(nodeFetch, 'default')
          .mockResolvedValue({ ok: true, text: async () => css } as any) // Remote

        setConfiguration({
          'markdown.marp.themes': ['https://example.com/test.css'],
        })
      })

      afterEach(() => {
        getWorkspaceFolderMock?.mockRestore()
        logMock?.mockRestore()
        fetchMock?.mockRestore()
      })

      it('loads specified theme CSS to tmp file and use it', async () => {
        const { themeSet, vscode } = await subject({ uri: untitledUri })

        try {
          expect(themeSet).toHaveLength(1)
          expect(workspace.fs.writeFile).toHaveBeenCalledWith(
            expect.objectContaining({ fsPath: themeSet[0] }),
            textEncoder.encode(css),
          )
        } finally {
          await Promise.all(vscode.themeFiles.map((w) => w.cleanup()))
        }
      })
    })

    describe('when the current workspace is untrusted', () => {
      let isTrustedMock: jest.SpyInstance

      beforeEach(() => {
        isTrustedMock = jest
          .spyOn(workspace, 'isTrusted', 'get')
          .mockImplementation(() => false)
      })

      afterEach(() => isTrustedMock?.mockRestore())

      it('disallows potentially malicious options', async () => {
        setConfiguration({ 'markdown.marp.html': 'all' })
        expect((await subject({ uri: untitledUri })).html).toBe(false)
      })
    })
  })
})
