import * as marpCliModule from '@marp-team/marp-cli'
import { commands, env, window, workspace } from 'vscode'
import * as marpCli from '../marp-cli'
import * as option from '../option'
import { createWorkspaceProxyServer } from '../workspace-proxy-server'
import * as exportModule from './export'

const exportCommand = exportModule.default

jest.mock('fs')
jest.mock('vscode')
jest.mock('../workspace-proxy-server', () => ({
  createWorkspaceProxyServer: jest.fn().mockResolvedValue({
    port: 8765,
    dispose: jest.fn(),
  }),
}))

const setConfiguration: (conf?: Record<string, unknown>) => void = (
  workspace as any
)._setConfiguration

describe('Export command', () => {
  let saveDialog: jest.SpyInstance

  beforeEach(() => {
    saveDialog = jest.spyOn(exportModule, 'saveDialog').mockImplementation()
  })

  afterEach(() => saveDialog?.mockRestore())

  it('has no ops when active text editor is undefined', async () => {
    window.activeTextEditor = undefined

    await exportCommand()
    expect(saveDialog).not.toHaveBeenCalled()
  })

  it('opens save dialog when active text editor is Markdown', async () => {
    const textEditor = { document: { languageId: 'markdown' } }
    window.activeTextEditor = textEditor as any

    await exportCommand()
    expect(saveDialog).toHaveBeenCalledWith(textEditor.document)
  })

  describe('when the current workspace is untrusted', () => {
    let isTrustedMock: jest.SpyInstance

    beforeEach(() => {
      isTrustedMock = jest
        .spyOn(workspace, 'isTrusted', 'get')
        .mockReturnValue(false)
    })

    afterEach(() => isTrustedMock?.mockRestore())

    it('shows error prompt', async () => {
      await exportCommand()
      expect(saveDialog).not.toHaveBeenCalled()
      expect(window.showErrorMessage).toHaveBeenCalled()
    })

    describe('when reacted with "Manage Workspace Trust..."', () => {
      beforeEach(() => {
        ;(window.showErrorMessage as any).mockResolvedValue(
          exportModule.ITEM_MANAGE_WORKSPACE_TRUST,
        )
      })

      it('executes "workbench.trust.manage" command when reacted on the prompt', async () => {
        await exportCommand()
        expect(commands.executeCommand).toHaveBeenCalledWith(
          'workbench.trust.manage',
        )
      })
    })
  })

  describe('when active text editor is not Markdown', () => {
    const textEditor = { document: { languageId: 'plaintext' } }

    beforeEach(() => {
      window.activeTextEditor = textEditor as any
    })

    it('shows warning notification', async () => {
      await exportCommand()
      expect(saveDialog).not.toHaveBeenCalled()
      expect(window.showWarningMessage).toHaveBeenCalled()
    })

    it('continues exporting when reacted on the notification to continue', async () => {
      const { showWarningMessage }: any = window
      showWarningMessage.mockResolvedValue(exportModule.ITEM_CONTINUE_TO_EXPORT)

      await exportCommand()
      expect(saveDialog).toHaveBeenCalledWith(textEditor.document)
    })
  })
})

describe('#saveDialog', () => {
  const document: any = { uri: { fsPath: '/tmp/test.md' } }

  it('opens save dialog with default URI', async () => {
    await exportModule.saveDialog(document)

    expect(window.showSaveDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultUri: expect.objectContaining({ fsPath: '/tmp/test.pdf' }),
      }),
    )
  })

  it('opens save dialog with default name "untitled" if the document is untitled', async () => {
    const document: any = { uri: { fsPath: '' }, isUntitled: true }

    await exportModule.saveDialog(document)

    expect(window.showSaveDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultUri: expect.objectContaining({ path: '/untitled.pdf' }),
      }),
    )
  })

  it('opens save dialog with configured default type', async () => {
    setConfiguration({ 'markdown.marp.exportType': 'pptx' })

    await exportModule.saveDialog(document)
    expect(window.showSaveDialog).toHaveBeenCalled()

    const { defaultUri, filters } = (window.showSaveDialog as jest.Mock).mock
      .calls[0][0]

    expect(defaultUri).toStrictEqual(
      expect.objectContaining({ fsPath: '/tmp/test.pptx' }),
    )
    expect(Object.values(filters)[0]).toStrictEqual(['pptx'])
  })

  describe('when confirmed save dialog', () => {
    const saveURI: any = {
      scheme: 'file',
      toString: () => 'PATH',
      fsPath: '/tmp/saveTo.pdf',
    }

    let showSaveDialogMock: jest.SpyInstance
    let doExportMock: jest.SpyInstance
    let exportResult: exportModule.ExportResult

    beforeEach(() => {
      exportResult = { uri: saveURI }

      showSaveDialogMock = jest
        .spyOn(window, 'showSaveDialog')
        .mockImplementation(() => saveURI)

      doExportMock = jest
        .spyOn(exportModule, 'doExport')
        .mockResolvedValue(exportResult)
    })

    afterEach(() => {
      showSaveDialogMock.mockRestore()
      doExportMock.mockRestore()
    })

    it('runs exporting with notification when file path is specified', async () => {
      await exportModule.saveDialog(document)

      expect(doExportMock).toHaveBeenCalledWith(saveURI, document)
      expect(window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('PATH') }),
        expect.any(Function),
      )

      // Success notification
      expect(window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Marp slide deck was successfully exported'),
      )
    })

    it('opens in external when doExport() returns with autoOpen field', async () => {
      exportResult.autoOpen = true

      await exportModule.saveDialog(document)
      expect(window.showInformationMessage).not.toHaveBeenCalled()
      expect(env.openExternal).toHaveBeenCalledWith(saveURI)
    })

    it('shows error message when doExport() returns with error field', async () => {
      exportResult.error = 'ERROR'

      await exportModule.saveDialog(document)
      expect(window.showInformationMessage).not.toHaveBeenCalled()
      expect(window.showErrorMessage).toHaveBeenCalledWith(exportResult.error)
    })
  })
})

describe('#doExport', () => {
  const saveURI = (scheme = 'file', ext = 'pdf'): any => {
    const instance = {
      scheme,
      path: `/tmp/to.${ext}`,
      fsPath: `/tmp/to.${ext}`,
      toString: () => `${scheme}://${instance.path}`,
    }
    return instance
  }

  const document: any = {
    uri: { scheme: 'file', path: '/tmp/md.md', fsPath: '/tmp/md.md' },
  }

  it('exports passed document via Marp CLI', async () => {
    const runMarpCLI = jest.spyOn(marpCli, 'default').mockImplementation()

    try {
      const uri = saveURI()
      const ret = await exportModule.doExport(uri, document)

      expect(ret).toStrictEqual(expect.objectContaining({ uri }))
      expect(runMarpCLI).toHaveBeenCalled()
      expect(createWorkspaceProxyServer).not.toHaveBeenCalled()
    } finally {
      runMarpCLI.mockRestore()
    }
  })

  it('contains error message when Marp CLI throws error', async () => {
    const marpCliSpy = jest.spyOn(marpCli, 'default')

    try {
      // MarpCLIError
      marpCliSpy.mockRejectedValueOnce(new marpCli.MarpCLIError('MarpCLIError'))
      expect(await exportModule.doExport(saveURI(), document)).toStrictEqual(
        expect.objectContaining({
          error: expect.stringContaining('MarpCLIError'),
        }),
      )

      // Error object
      marpCliSpy.mockRejectedValueOnce(new Error('ERROR'))
      expect(await exportModule.doExport(saveURI(), document)).toStrictEqual(
        expect.objectContaining({
          error: expect.stringContaining('[Error] ERROR'),
        }),
      )

      // Unknown error (via toString())
      marpCliSpy.mockRejectedValueOnce('UNKNOWN ERROR!')
      expect(await exportModule.doExport(saveURI(), document)).toStrictEqual(
        expect.objectContaining({
          error: expect.stringContaining('UNKNOWN ERROR!'),
        }),
      )

      marpCliSpy.mockRejectedValueOnce('UNKNOWN ERROR!')
      expect(await exportModule.doExport(saveURI(), document)).toStrictEqual(
        expect.objectContaining({
          error: expect.stringContaining('UNKNOWN ERROR!'),
        }),
      )

      // WTF
      marpCliSpy.mockRejectedValueOnce(null)
      expect(await exportModule.doExport(saveURI(), document)).toStrictEqual(
        expect.objectContaining({
          error: 'Failure to export by unknown error.',
        }),
      )
    } finally {
      marpCliSpy.mockRestore()
    }
  })

  describe('when enabled markdown.marp.strictPathResolutionDuringExport', () => {
    let marpCliMock: jest.SpyInstance

    beforeEach(() => {
      setConfiguration({
        'markdown.marp.strictPathResolutionDuringExport': true,
      })
      marpCliMock = jest.spyOn(marpCli, 'default').mockImplementation()
    })

    afterEach(() => marpCliMock?.mockRestore())

    it('opens workspace proxy server during export if the document has file scheme', async () => {
      const fileWorkspace: any = {
        name: 'file',
        index: 0,
        uri: {
          scheme: 'file',
          path: 'file:///tmp',
          fsPath: '/tmp',
        },
      }

      const getWorkspaceFolderMock = jest
        .spyOn(workspace, 'getWorkspaceFolder')
        .mockReturnValue(fileWorkspace)

      try {
        await exportModule.doExport(saveURI(), document)
        expect(createWorkspaceProxyServer).toHaveBeenCalledWith(fileWorkspace)
      } finally {
        getWorkspaceFolderMock.mockRestore()
      }
    })

    it('does not open workspace proxy server if the document is untitled', async () => {
      const untitledDocument: any = {
        uri: { scheme: 'untitled', path: 'untitled.md', fsPath: 'untitled.md' },
        isUntitled: true,
        getText: () => '',
      }

      await exportModule.doExport(saveURI(), untitledDocument)
      expect(createWorkspaceProxyServer).not.toHaveBeenCalled()
    })
  })

  describe('when enabled markdown.marp.pdf.noteAnnotations', () => {
    let marpCliMock: jest.SpyInstance

    beforeEach(() => {
      setConfiguration({ 'markdown.marp.pdf.noteAnnotations': true })
      marpCliMock = jest.spyOn(marpCli, 'default').mockImplementation()
    })

    afterEach(() => marpCliMock?.mockRestore())

    it('enables pdfNotes option while exporting PDF', async () => {
      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pdf'), document)

      expect(optionGeneratorSpy).toHaveBeenCalledWith(
        document,
        expect.objectContaining({ pdfNotes: true }),
      )
    })

    it('disables pdfNotes option while exporting to other extensions', async () => {
      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pptx'), document)

      expect(optionGeneratorSpy).toHaveBeenCalledWith(
        document,
        expect.objectContaining({ pdfNotes: false }),
      )
    })
  })

  describe('when enabled markdown.marp.pptx.editable', () => {
    let marpCliMock: jest.SpyInstance

    beforeEach(() => {
      marpCliMock = jest.spyOn(marpCli, 'default').mockImplementation()
    })

    afterEach(() => marpCliMock?.mockRestore())

    it('enables pptxEditable option while exporting PPTX when the setting is "on"', async () => {
      setConfiguration({ 'markdown.marp.pptx.editable': 'on' })

      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pptx'), document)
      expect(optionGeneratorSpy).toHaveBeenCalledTimes(1)

      const ret = await optionGeneratorSpy.mock.results[0].value
      expect(ret).toStrictEqual(expect.objectContaining({ pptxEditable: true }))
    })

    it('enables pptxEditable option while exporting PPTX when the setting is "smart"', async () => {
      setConfiguration({ 'markdown.marp.pptx.editable': 'smart' })

      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pptx'), document)

      expect(marpCliMock).toHaveBeenCalledTimes(1)
      expect(optionGeneratorSpy).toHaveBeenCalledTimes(1)

      const ret = await optionGeneratorSpy.mock.results[0].value
      expect(ret).toStrictEqual(expect.objectContaining({ pptxEditable: true }))
    })

    it('retries exporting with disabling pptxEditable option when the setting is "smart" and failed the first export', async () => {
      setConfiguration({ 'markdown.marp.pptx.editable': 'smart' })

      marpCliMock.mockRejectedValueOnce(new Error('Failed to export'))

      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pptx'), document)

      expect(marpCliMock).toHaveBeenCalledTimes(2)
      expect(optionGeneratorSpy).toHaveBeenCalledTimes(2)

      const first = await optionGeneratorSpy.mock.results[0].value
      expect(first).toStrictEqual(
        expect.objectContaining({ pptxEditable: true }),
      )

      const second = await optionGeneratorSpy.mock.results[1].value
      expect(second).toStrictEqual(
        expect.objectContaining({ pptxEditable: false }),
      )
    })
  })

  describe('when CLI was thrown CLIError with BROWSER_NOT_FOUND error code', () => {
    it.each`
      browser      | platform    | expected
      ${'auto'}    | ${'win32'}  | ${['Google Chrome', 'Microsoft Edge', 'Firefox']}
      ${'auto'}    | ${'darwin'} | ${['Google Chrome', 'Microsoft Edge', 'Firefox']}
      ${'auto'}    | ${'linux'}  | ${['Google Chrome', 'Chromium', 'Microsoft Edge', 'Firefox']}
      ${'chrome'}  | ${'win32'}  | ${['Google Chrome']}
      ${'chrome'}  | ${'darwin'} | ${['Google Chrome']}
      ${'chrome'}  | ${'linux'}  | ${['Google Chrome', 'Chromium']}
      ${'edge'}    | ${'win32'}  | ${['Microsoft Edge']}
      ${'edge'}    | ${'darwin'} | ${['Microsoft Edge']}
      ${'edge'}    | ${'linux'}  | ${['Microsoft Edge']}
      ${'firefox'} | ${'win32'}  | ${['Firefox']}
      ${'firefox'} | ${'darwin'} | ${['Firefox']}
      ${'firefox'} | ${'linux'}  | ${['Firefox']}
    `(
      'returns error with the message contains $expected to suggest browsers when running on $platform with browser option as $browser',
      async ({ browser, platform, expected }) => {
        expect.assertions(expected.length)
        setConfiguration({ 'markdown.marp.browser': browser })

        const { platform: originalPlatform } = process

        try {
          Object.defineProperty(process, 'platform', { value: platform })

          const runMarpCLI = jest
            .spyOn(marpCli, 'default')
            .mockImplementation(async (_, __, opts) => {
              opts?.onCLIError?.({
                error: new marpCliModule.CLIError(
                  'mocked error',
                  marpCliModule.CLIErrorCode.NOT_FOUND_BROWSER,
                ),
                codes: marpCliModule.CLIErrorCode,
              })
            })

          try {
            const ret = await exportModule.doExport(saveURI(), document)

            for (const fragment of expected) {
              expect(ret.error).toContain(fragment)
            }
          } finally {
            runMarpCLI.mockRestore()
          }
        } finally {
          Object.defineProperty(process, 'platform', {
            value: originalPlatform,
          })
        }
      },
    )
  })

  describe('when CLI was thrown CLIError with NOT_FOUND_SOFFICE error code', () => {
    it('returns error with the user-friendly message to suggest installing LibreOffice', async () => {
      const runMarpCLI = jest
        .spyOn(marpCli, 'default')
        .mockImplementation(async (_, __, opts) => {
          opts?.onCLIError?.({
            error: new marpCliModule.CLIError(
              'mocked error',
              marpCliModule.CLIErrorCode.NOT_FOUND_SOFFICE,
            ),
            codes: marpCliModule.CLIErrorCode,
          })
        })

      try {
        const ret = await exportModule.doExport(saveURI(), document)

        expect(ret.error).toContain(
          'It requires to install LibreOffice Impress for exporting to the editable PowerPoint document.',
        )
      } finally {
        runMarpCLI.mockRestore()
      }
    })
  })

  describe('when the save path has non-file scheme', () => {
    it('exports the document into temporally path and copy it to the save path', async () => {
      const marpCliMock = jest.spyOn(marpCli, 'default').mockImplementation()

      try {
        for (const isWritableFileSystem of [true, undefined]) {
          const isWritableFileSystemMock = jest
            .spyOn(workspace.fs, 'isWritableFileSystem')
            .mockReturnValue(isWritableFileSystem)

          try {
            const saveURIinstance = saveURI('unknown-scheme', 'pdf')
            await exportModule.doExport(saveURIinstance, document)
            expect(workspace.fs.copy).toHaveBeenCalled()

            const { calls } = (workspace.fs.copy as jest.Mock).mock
            const [source, target] = calls[calls.length - 1]

            expect(source.path).toContain('marp-vscode-tmp')
            expect(source.path).toMatch(/\.pdf$/)
            expect(source.scheme).toBe('file')
            expect(target).toBe(saveURIinstance)
          } finally {
            isWritableFileSystemMock.mockRestore()
          }
        }
      } finally {
        marpCliMock.mockRestore()
      }
    })

    it('shows warning when the scheme of save path has not-writable file system', async () => {
      const isWritableFileSystemMock = jest
        .spyOn(workspace.fs, 'isWritableFileSystem')
        .mockReturnValue(false)

      try {
        const ret = await exportModule.doExport(
          saveURI('readonly', 'pdf'),
          document,
        )

        expect(ret.error).toContain('Could not write to readonly file system.')
      } finally {
        isWritableFileSystemMock.mockRestore()
      }
    })
  })

  describe('when the document belongs to the virtual file system', () => {
    const vfsDocument: any = {
      uri: {
        scheme: 'vscode-vfs',
        path: 'vscode-vfs://dummy.path/tmp/md.md',
        fsPath: '/vscode-vfs/dummy.path/tmp/md.md',
      },
      getText: () => '',
    }

    const virtualWorkspace: any = {
      name: 'virtual-workspace',
      index: 0,
      uri: {
        scheme: 'vscode-vfs',
        path: 'vscode-vfs://dummy.path/tmp',
        fsPath: '/vscode-vfs/dummy.path/tmp',
      },
    }

    let debugMock: jest.SpyInstance

    beforeEach(() => {
      debugMock = jest.spyOn(console, 'debug').mockImplementation()
    })

    afterEach(() => debugMock?.mockRestore())

    it('opens workspace proxy server while exporting to pdf', async () => {
      const marpCliMock = jest.spyOn(marpCli, 'default').mockImplementation()
      const getWorkspaceFolderMock = jest
        .spyOn(workspace, 'getWorkspaceFolder')
        .mockReturnValue(virtualWorkspace)

      try {
        await exportModule.doExport(saveURI(), vfsDocument)
        expect(createWorkspaceProxyServer).toHaveBeenCalledWith(
          virtualWorkspace,
        )

        // dispose method
        const proxyServer = await (createWorkspaceProxyServer as any).mock
          .results[0].value

        expect(proxyServer.dispose).toHaveBeenCalled()
      } finally {
        marpCliMock.mockRestore()
        getWorkspaceFolderMock.mockRestore()
      }
    })

    it('does not open workspace proxy server while exporting to html', async () => {
      const marpCliMock = jest.spyOn(marpCli, 'default').mockImplementation()
      const getWorkspaceFolderMock = jest
        .spyOn(workspace, 'getWorkspaceFolder')
        .mockReturnValue(virtualWorkspace)

      try {
        await exportModule.doExport(saveURI('file', 'html'), vfsDocument)
        expect(createWorkspaceProxyServer).not.toHaveBeenCalled()
      } finally {
        marpCliMock.mockRestore()
        getWorkspaceFolderMock.mockRestore()
      }
    })
  })
})
