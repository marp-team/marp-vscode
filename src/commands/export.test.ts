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
    beforeEach(() => {
      jest.spyOn(workspace, 'isTrusted', 'get').mockImplementation(() => false)
    })

    it('shows error prompt', async () => {
      await exportCommand()
      expect(saveDialog).not.toHaveBeenCalled()
      expect(window.showErrorMessage).toHaveBeenCalled()
    })

    describe('when reacted with "Manage Workspace Trust..."', () => {
      beforeEach(() => {
        ;(window.showErrorMessage as any).mockResolvedValue(
          exportModule.ITEM_MANAGE_WORKSPACE_TRUST
        )
      })

      it('executes "workbench.trust.manage" command when reacted on the prompt', async () => {
        await exportCommand()
        expect(commands.executeCommand).toHaveBeenCalledWith(
          'workbench.trust.manage'
        )
      })

      it('fallbacks to "workbench.action.manageTrust" command for VS Code 1.57 if throwed error', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation()
        const err = new Error('!')

        ;(commands.executeCommand as any).mockRejectedValueOnce(err)

        await exportCommand()
        expect(error).toHaveBeenCalledWith(err)
        expect(commands.executeCommand).toHaveBeenCalledWith(
          'workbench.action.manageTrust'
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
      })
    )
  })

  it('opens save dialog with configured default type', async () => {
    setConfiguration({ 'markdown.marp.exportType': 'pptx' })

    await exportModule.saveDialog(document)
    expect(window.showSaveDialog).toHaveBeenCalled()

    const { defaultUri, filters } = (window.showSaveDialog as jest.Mock).mock
      .calls[0][0]

    expect(defaultUri).toStrictEqual(
      expect.objectContaining({ fsPath: '/tmp/test.pptx' })
    )
    expect(Object.values(filters)[0]).toStrictEqual(['pptx'])
  })

  it('runs exporting with notification when file path is specified', async () => {
    const saveURI: any = {
      scheme: 'file',
      toString: () => 'PATH',
      fsPath: '/tmp/saveTo.pdf',
    }
    jest.spyOn(window, 'showSaveDialog').mockImplementation(() => saveURI)

    const doExportMock: jest.SpyInstance = jest
      .spyOn(exportModule, 'doExport')
      .mockImplementation()

    await exportModule.saveDialog(document)
    expect(window.withProgress).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('PATH') }),
      expect.any(Function)
    )
    ;(window.withProgress as any).mock.calls[0][1]()
    expect(doExportMock).toHaveBeenCalledWith(saveURI, document)
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

  it('exports passed document via Marp CLI and opens it', async () => {
    const runMarpCLI = jest.spyOn(marpCli, 'default').mockImplementation()
    const uri = saveURI()

    await exportModule.doExport(uri, document)
    expect(runMarpCLI).toHaveBeenCalled()
    expect(env.openExternal).toHaveBeenCalledWith(uri)
  })

  it('shows warning when Marp CLI throws error', async () => {
    jest.spyOn(marpCli, 'default').mockRejectedValue(new Error('ERROR'))

    await exportModule.doExport(saveURI(), document)
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('[Error] ERROR')
    )
  })

  describe('when enabled markdown.marp.pdf.noteAnnotations', () => {
    beforeEach(() => {
      setConfiguration({ 'markdown.marp.pdf.noteAnnotations': true })
      jest.spyOn(marpCli, 'default').mockImplementation()
    })

    it('enables pdfNotes option while exporting PDF', async () => {
      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pdf'), document)

      expect(optionGeneratorSpy).toHaveBeenCalledWith(
        document,
        expect.objectContaining({ pdfNotes: true })
      )
    })

    it('disables pdfNotes option while exporting to other extensions', async () => {
      const optionGeneratorSpy = jest.spyOn(option, 'marpCoreOptionForCLI')
      await exportModule.doExport(saveURI('file', 'pptx'), document)

      expect(optionGeneratorSpy).toHaveBeenCalledWith(
        document,
        expect.objectContaining({ pdfNotes: false })
      )
    })
  })

  describe('when the save path has non-file scheme', () => {
    it('exports the document into temporally path and copy it to the save path', async () => {
      jest.spyOn(marpCli, 'default').mockImplementation()

      for (const isWritableFileSystem of [true, undefined]) {
        jest
          .spyOn(workspace.fs, 'isWritableFileSystem')
          .mockReturnValue(isWritableFileSystem)

        const saveURIinstance = saveURI('unknown-scheme', 'pdf')
        await exportModule.doExport(saveURIinstance, document)
        expect(workspace.fs.copy).toHaveBeenCalled()

        const { calls } = (workspace.fs.copy as jest.Mock).mock
        const [source, target] = calls[calls.length - 1]

        expect(source.path).toContain('marp-vscode-tmp')
        expect(source.path).toMatch(/\.pdf$/)
        expect(source.scheme).toBe('file')
        expect(target).toBe(saveURIinstance)

        expect(window.showInformationMessage).toHaveBeenCalledWith(
          'Marp slide deck was successfully exported to unknown-scheme:///tmp/to.pdf.'
        )
      }
    })

    it('shows warning when the scheme of save path has not-writable file system', async () => {
      jest.spyOn(workspace.fs, 'isWritableFileSystem').mockReturnValue(false)

      await exportModule.doExport(saveURI('readonly', 'pdf'), document)

      expect(window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Could not write to readonly file system.')
      )
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

    beforeEach(() => {
      jest.spyOn(console, 'debug').mockImplementation()
    })

    it('opens workspace proxy server while exporting to pdf', async () => {
      jest.spyOn(marpCli, 'default').mockImplementation()
      jest
        .spyOn(workspace, 'getWorkspaceFolder')
        .mockReturnValue(virtualWorkspace)

      await exportModule.doExport(saveURI(), vfsDocument)
      expect(createWorkspaceProxyServer).toHaveBeenCalledWith(virtualWorkspace)

      // dispose method
      const proxyServer = await (createWorkspaceProxyServer as any).mock
        .results[0].value

      expect(proxyServer.dispose).toHaveBeenCalled()
    })

    it('does not open workspace proxy server while exporting to html', async () => {
      jest.spyOn(marpCli, 'default').mockImplementation()
      jest
        .spyOn(workspace, 'getWorkspaceFolder')
        .mockReturnValue(virtualWorkspace)

      await exportModule.doExport(saveURI('file', 'html'), vfsDocument)
      expect(createWorkspaceProxyServer).not.toHaveBeenCalled()
    })
  })
})
