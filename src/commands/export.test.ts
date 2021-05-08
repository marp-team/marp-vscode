import { env, window, workspace } from 'vscode'
import * as marpCli from '../marp-cli'
import * as exportModule from './export'

const exportCommand = exportModule.default

jest.mock('vscode')

const setConfiguration: (
  conf?: Record<string, unknown>
) => void = (workspace as any)._setConfiguration

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
        defaultUri: expect.objectContaining({ fsPath: '/tmp/test' }),
      })
    )
  })

  it('opens save dialog with configured default type', async () => {
    setConfiguration({ 'markdown.marp.exportType': 'pptx' })

    await exportModule.saveDialog(document)
    expect(window.showSaveDialog).toHaveBeenCalled()

    const { filters } = (window.showSaveDialog as jest.Mock).mock.calls[0][0]
    expect(Object.values(filters)[0]).toStrictEqual(['pptx'])
  })

  it('runs exporting with notification when file path is specified', async () => {
    const saveURI: any = { path: 'PATH', fsPath: '/tmp/saveTo.pdf' }
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
  const saveURI: any = { path: '/tmp/to.pdf', fsPath: '/tmp/to.pdf' }
  const document: any = {
    uri: { scheme: 'file', path: '/tmp/md.md', fsPath: '/tmp/md.md' },
  }

  it('exports passed document via Marp CLI and opens it', async () => {
    const runMarpCLI = jest.spyOn(marpCli, 'default').mockImplementation()

    await exportModule.doExport(saveURI, document)
    expect(runMarpCLI).toHaveBeenCalled()
    expect(env.openExternal).toHaveBeenCalledWith(saveURI)
  })

  it('shows warning when Marp CLI throws error', async () => {
    jest.spyOn(marpCli, 'default').mockRejectedValue(new Error('ERROR'))

    await exportModule.doExport(saveURI, document)
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('[Error] ERROR')
    )
  })
})
