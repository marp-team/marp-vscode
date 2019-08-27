import { Position, Range, languages, window } from 'vscode'
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
  const editBuilder = () => ({
    replace: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  })

  const textEditor = (text: string): any => {
    const textEditorMock: any = {
      _editBuilders: [],
      document: { getText: () => text },
    }

    textEditorMock.edit = jest.fn(callback => {
      const builder = editBuilder()
      textEditorMock._editBuilders.push(builder)

      return Promise.resolve(callback(builder))
    })

    return textEditorMock
  }

  it('inserts frontmatter to the top when frontmatter was not detected', async () => {
    const editor = textEditor('')
    await toggleMarpPreview.toggle(editor)

    expect(editor._editBuilders[0].insert).toBeCalledWith(
      new Position(0, 0),
      '---\nmarp: true\n---\n\n'
    )
  })

  it('inserts `marp: true` to the last line of frontmatter when frontmatter without marp key was detected', async () => {
    const editor = textEditor('---\ntest: abc\nfoo: bar\n---')
    await toggleMarpPreview.toggle(editor)

    expect(editor._editBuilders[0].insert).toBeCalledWith(
      new Position(3, 0),
      'marp: true\n'
    )

    // Empty frontmatter
    const editorEmptyFm = textEditor('---\n---')
    await toggleMarpPreview.toggle(editorEmptyFm)

    expect(editorEmptyFm._editBuilders[0].insert).toBeCalledWith(
      new Position(1, 0),
      'marp: true\n'
    )
  })

  it('toggles the value of marp key in frontmatter when frontmatter with marp key was detected', async () => {
    // true => false
    const editorEnabled = textEditor('---\nmarp: true\n---')
    await toggleMarpPreview.toggle(editorEnabled)

    expect(editorEnabled._editBuilders[0].replace).toBeCalledWith(
      new Range(new Position(1, 6), new Position(1, 10)),
      'false'
    )

    // false => true
    const editorDisabled = textEditor('---\nfoo: bar\nmarp:   false\n---')
    await toggleMarpPreview.toggle(editorDisabled)

    expect(editorDisabled._editBuilders[0].replace).toBeCalledWith(
      new Range(new Position(2, 8), new Position(2, 13)),
      'true'
    )
  })
})
