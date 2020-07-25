import { env, window, workspace } from 'vscode'
import * as exportModule from './export'
import * as marpCli from '../marp-cli'

const exportCommand = exportModule.default

jest.mock('vscode')

const setConfiguration: (conf?: object) => void = (workspace as any)
  ._setConfiguration

describe('Export command', () => {
  let saveDialog: jest.SpyInstance

  beforeEach(() => {
    saveDialog = jest.spyOn(exportModule, 'saveDialog').mockImplementation()
  })

  it('has no ops when active text editor is undefined', async () => {
    window.activeTextEditor = undefined

    await exportCommand()
    expect(saveDialog).not.toBeCalled()
  })

  it('opens save dialog when active text editor is Markdown', async () => {
    window.activeTextEditor = { document: { languageId: 'markdown' } } as any

    await exportCommand()
    expect(saveDialog).toBeCalledWith(window.activeTextEditor!.document)
  })

  describe('when active text editor is not Markdown', () => {
    beforeEach(() => {
      window.activeTextEditor = { document: { languageId: 'plaintext' } } as any
    })

    it('shows warning notification', async () => {
      await exportCommand()
      expect(saveDialog).not.toBeCalled()
      expect(window.showWarningMessage).toBeCalled()
    })

    it('continues exporting when reacted on the notification to continue', async () => {
      const { showWarningMessage }: any = window
      showWarningMessage.mockResolvedValue(exportModule.ITEM_CONTINUE_TO_EXPORT)

      await exportCommand()
      expect(saveDialog).toBeCalledWith(window.activeTextEditor!.document)
    })
  })
})

describe('#saveDialog', () => {
  const document: any = { uri: { fsPath: '/tmp/test.md' } }

  it('opens save dialog with default URI', async () => {
    await exportModule.saveDialog(document)

    expect(window.showSaveDialog).toBeCalledWith(
      expect.objectContaining({
        defaultUri: expect.objectContaining({ fsPath: '/tmp/test' }),
      })
    )
  })

  it('opens save dialog with configured default type', async () => {
    setConfiguration({ 'markdown.marp.exportType': 'pptx' })

    await exportModule.saveDialog(document)
    expect(window.showSaveDialog).toBeCalled()

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
    expect(window.withProgress).toBeCalledWith(
      expect.objectContaining({ title: expect.stringContaining('PATH') }),
      expect.any(Function)
    )
    ;(window.withProgress as any).mock.calls[0][1]()
    expect(doExportMock).toBeCalledWith(saveURI, document)
  })
})

describe('#doExport', () => {
  const saveURI: any = { fsPath: '/tmp/to.pdf' }
  const document: any = { uri: { scheme: 'file', fsPath: '/tmp/md.md' } }

  it('exports passed document via Marp CLI and opens it', async () => {
    const runMarpCLI = jest.spyOn(marpCli, 'default').mockImplementation()

    await exportModule.doExport(saveURI, document)
    expect(runMarpCLI).toBeCalled()
    expect(env.openExternal).toBeCalledWith(saveURI)
  })

  it('shows warning when Marp CLI throws error', async () => {
    jest.spyOn(marpCli, 'default').mockRejectedValue(new Error('ERROR'))

    await exportModule.doExport(saveURI, document)
    expect(window.showErrorMessage).toBeCalledWith(
      expect.stringContaining('[Error] ERROR')
    )
  })
})
