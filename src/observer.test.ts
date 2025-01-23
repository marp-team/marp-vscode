import { commands, window, TabInputWebview } from 'vscode'
import * as observer from './observer'

jest.mock('vscode')

beforeEach(() => {
  jest.useFakeTimers()

  window.visibleTextEditors = []
  ;(window as any).tabGroups = { all: [] }
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe('Incompatible preview extensions observer', () => {
  const document = {
    languageId: 'markdown',
    getText: () => '---\nmarp: true\n---',
    uri: '/test/document',
  }
  const editor = { document, viewColumn: 0 } as any
  const mpeTab = {
    input: new TabInputWebview(
      // Markdown Preview Enhanced
      'mainThreadWebview-markdown-preview-enhanced',
    ),
  }

  it('returns ViewObserver', async () => {
    const instance = observer.incompatiblePreviewExtensionsObserver()
    expect(instance).toBeInstanceOf(observer.ViewObserver)
    expect(instance.state).toStrictEqual({
      marpDocument: {
        opening: false,
        editor: null,
      },
      incompatiblePreview: {
        opening: false,
        type: null,
      },
    })
  })

  it('runs tick function every 1000ms', () => {
    const tickMock = jest
      .spyOn(observer.ViewObserver.prototype as any, 'tick')
      .mockImplementation()

    try {
      const instance = observer.incompatiblePreviewExtensionsObserver()
      expect(instance).toBeInstanceOf(observer.ViewObserver)
      expect(tickMock).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(999)
      expect(tickMock).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(1)
      expect(tickMock).toHaveBeenCalledTimes(2)

      jest.advanceTimersByTime(1500)
      expect(tickMock).toHaveBeenCalledTimes(3)

      // Reset tick interval when restarted
      instance.start()
      jest.advanceTimersByTime(999)
      expect(tickMock).toHaveBeenCalledTimes(4) // Tick was only once called after restart

      // Stop observer
      instance.dispose()
      jest.advanceTimersByTime(3000)
      expect(tickMock).toHaveBeenCalledTimes(4)
    } finally {
      tickMock.mockRestore()
    }
  })

  it('shows notification message when Marp document is opening and incompatible preview is detected', async () => {
    window.visibleTextEditors = [editor]
    ;(window as any).tabGroups.all = [{ tabs: [mpeTab] }]
    ;(window as any).showWarningMessage.mockResolvedValue(
      observer.OPEN_MARKDOWN_PREVIEW_BY_VS_CODE,
    )

    const instance = observer.incompatiblePreviewExtensionsObserver()
    expect(instance.state).toStrictEqual({
      marpDocument: { opening: true, editor },
      incompatiblePreview: { opening: true, type: 'markdown-preview-enhanced' },
    })

    expect(window.showWarningMessage).toHaveBeenCalledWith(
      `The Markdown preview provided by Markdown Preview Enhanced extension is not compatible with Marp. To preview Marp slide, please open the Markdown preview provided by VS Code.`,
      observer.OPEN_MARKDOWN_PREVIEW_BY_VS_CODE,
      observer.DONT_NOTIFY_AGAIN,
    )
    await (window.showWarningMessage as any).mock.results[0].value

    expect(window.showTextDocument).toHaveBeenCalledWith(
      document,
      editor.viewColumn,
    )
    await (window.showTextDocument as any).mock.results[0].value

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'markdown.showPreviewToSide',
      document.uri,
    )

    // It does not emit notification again
    jest.advanceTimersByTime(1000)
    expect(window.showWarningMessage).toHaveBeenCalledTimes(1)
  })

  it('does not show notification message again when it was closed with "DONT_NOTIFY_AGAIN"', async () => {
    window.visibleTextEditors = [editor]
    ;(window as any).tabGroups.all = [{ tabs: [mpeTab] }]
    ;(window as any).showWarningMessage.mockResolvedValue(
      observer.DONT_NOTIFY_AGAIN,
    )

    const instance = observer.incompatiblePreviewExtensionsObserver()
    expect(instance.state).toStrictEqual({
      marpDocument: { opening: true, editor },
      incompatiblePreview: { opening: true, type: 'markdown-preview-enhanced' },
    })

    expect(window.showWarningMessage).toHaveBeenCalledTimes(1)
    await (window.showWarningMessage as any).mock.results[0].value

    // Hide text editor once
    window.visibleTextEditors = []
    jest.advanceTimersByTime(1000)

    expect(instance.state).toStrictEqual({
      marpDocument: { opening: false, editor: null },
      incompatiblePreview: { opening: true, type: 'markdown-preview-enhanced' },
    })
    expect(window.showWarningMessage).toHaveBeenCalledTimes(1)

    // Show text editor again, but it does not emit notification
    window.visibleTextEditors = [editor]
    jest.advanceTimersByTime(1000)

    expect(instance.state).toStrictEqual({
      marpDocument: { opening: true, editor },
      incompatiblePreview: { opening: true, type: 'markdown-preview-enhanced' },
    })
    expect(window.showWarningMessage).toHaveBeenCalledTimes(1)
  })
})
