import { languages, window } from 'vscode'
import * as toggleMarpPreview from './toggle-marp-preview'

const toggleMarpPreviewCommand = toggleMarpPreview.default

jest.mock('vscode')

describe('toggleMarpPreview command', () => {
  let toggleFunc: jest.SpyInstance

  beforeEach(() => {
    toggleFunc = jest.spyOn(toggleMarpPreview, 'toggle').mockImplementation()
  })

  it('has no ops when active text editor is undefined', async () => {
    window.activeTextEditor = undefined

    await toggleMarpPreviewCommand()
    expect(toggleFunc).not.toBeCalled()
  })

  it('runs toggle function when active text editor is Markdown', async () => {
    window.activeTextEditor = { document: { languageId: 'markdown' } } as any

    await toggleMarpPreviewCommand()
    expect(toggleFunc).toBeCalledWith(window.activeTextEditor)
  })

  describe('when active text editor is not Markdown', () => {
    beforeEach(() => {
      window.activeTextEditor = { document: { languageId: 'plaintext' } } as any
    })

    it('shows warning notification', async () => {
      await toggleMarpPreviewCommand()
      expect(toggleFunc).not.toBeCalled()
      expect(window.showWarningMessage).toBeCalled()
    })

    it('changes editor language and continues process when reacted on the notification', async () => {
      const { showWarningMessage }: any = window
      showWarningMessage.mockResolvedValue(
        toggleMarpPreview.ITEM_CONTINUE_BY_CHANGING_LANGUAGE
      )

      await toggleMarpPreviewCommand()
      expect(languages.setTextDocumentLanguage).toBeCalledWith(
        window.activeTextEditor!.document,
        'markdown'
      )
      expect(toggleFunc).toBeCalledWith(window.activeTextEditor)
    })
  })
})

describe('#toggle', () => {
  it.todo('toggle')
})
