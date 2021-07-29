import fs from 'fs'
import { promisify } from 'util'
import * as nodeFetch from 'node-fetch'
import { Uri, workspace } from 'vscode'
import * as option from './option'

jest.mock('node-fetch')
jest.mock('vscode')

const readFile = promisify(fs.readFile)

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

      // --allow-local-files
      expect(opts.allowLocalFiles).toBe(true)
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
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(true)

      setConfiguration({ 'markdown.marp.breaks': 'off' })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(false)

      // inherit option (markdown.preview.breaks)
      setConfiguration({
        'markdown.marp.breaks': 'inherit',
        'markdown.preview.breaks': true,
      })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(true)

      setConfiguration({
        'markdown.marp.breaks': 'inherit',
        'markdown.preview.breaks': false,
      })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(false)
    })

    it('enables typographer by preference', async () => {
      expect(
        (await subject({ uri: untitledUri })).options.markdown.typographer
      ).toBeUndefined()

      setConfiguration({ 'markdown.preview.typographer': true })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.typographer
      ).toBe(true)

      setConfiguration({ 'markdown.preview.typographer': false })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.typographer
      ).toBe(false)
    })

    describe('when targeted document belongs to workspace', () => {
      const css = '/* @theme test */'

      beforeEach(() => {
        // Workspace
        jest
          .spyOn(workspace, 'getWorkspaceFolder')
          .mockImplementationOnce((): any => ({
            uri: { scheme: 'file', fsPath: '/workspace/' },
          }))

        // Theme CSS
        jest.spyOn(console, 'log').mockImplementation()
        jest
          .spyOn(nodeFetch, 'default')
          .mockResolvedValue({ ok: true, text: async () => css } as any) // Remote

        setConfiguration({
          'markdown.marp.themes': ['https://example.com/test.css'],
        })
      })

      it('loads specified theme CSS to tmp file and use it', async () => {
        const { themeSet, vscode } = await subject({ uri: untitledUri })

        try {
          expect(themeSet).toHaveLength(1)
          expect((await readFile(themeSet[0])).toString()).toBe(css)
        } finally {
          await Promise.all(vscode.themeFiles.map((w) => w.cleanup()))
        }
      })
    })

    describe('when the current workspace is untrusted', () => {
      beforeEach(() => {
        jest
          .spyOn(workspace, 'isTrusted', 'get')
          .mockImplementation(() => false)
      })

      it('ignores potentially malicious options', async () => {
        setConfiguration({ 'markdown.marp.enableHtml': true })
        expect((await subject({ uri: untitledUri })).html).toBeUndefined()
      })
    })
  })
})
