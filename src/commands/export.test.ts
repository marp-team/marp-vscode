import { window } from 'vscode'
import * as exportModule from './export'

const exportCommand = exportModule.default

jest.mock('vscode')

describe('Export command', () => {
  let saveDialog: jest.Mock

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

  it('runs exporting with notification when file path is specified', async () => {
    const saveURI: any = { path: 'PATH', fsPath: '/tmp/saveTo.pdf' }
    jest.spyOn(window, 'showSaveDialog').mockImplementation(() => saveURI)

    const doExportMock: jest.Mock = jest
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
