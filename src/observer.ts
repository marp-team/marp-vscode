import { EventEmitter } from 'node:events'
import TypedEmitter from 'typed-emitter'
import { TabInputWebview, commands, window } from 'vscode'
import type { Disposable, TextEditor } from 'vscode'
import { detectMarpDocument } from './utils'

type IncompatiblePreviewType = 'markdown-preview-enhanced'

const providedBy = {
  'markdown-preview-enhanced': 'Markdown Preview Enhanced extension',
} as const satisfies Record<IncompatiblePreviewType, string>

interface ViewObserverState {
  marpDocument: {
    opening: boolean
    editor: TextEditor | null
  }
  incompatiblePreview: {
    opening: boolean
    type: IncompatiblePreviewType | null
  }
}

interface ViewObserverEventHandler {
  observer: ViewObserver
}

interface ViewObserverChangeStateEventHandler extends ViewObserverEventHandler {
  state: ViewObserverState
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ViewObserverEvents = {
  change: (event: ViewObserverChangeStateEventHandler) => void
  start: (event: ViewObserverEventHandler) => void
  stop: (event: ViewObserverEventHandler) => void
}

class ViewObserver
  extends (EventEmitter as new () => TypedEmitter<ViewObserverEvents>)
  implements Disposable
{
  #active = false
  #interval: number
  #timer: NodeJS.Timeout | null = null
  #state: ViewObserverState | null = null

  constructor(interval: number) {
    super()

    this.#interval = interval
  }

  get state() {
    return this.#state
  }

  start() {
    if (this.#active) this.dispose()

    this.emit('start', { observer: this })
    this.#active = true
    this.#timer = setInterval(() => this.tick(), this.#interval)
    this.tick()

    return this
  }

  dispose() {
    this.#active = false
    this.#state = null

    if (this.#timer) {
      clearInterval(this.#timer)
      this.#timer = null
    }

    this.emit('stop', { observer: this })
  }

  private tick() {
    const openingMarpEditor = (() => {
      for (const textEditor of window.visibleTextEditors) {
        if (detectMarpDocument(textEditor.document)) return textEditor
      }
      return null
    })()

    const incompatiblePreview = ((): IncompatiblePreviewType | null => {
      for (const tabGroup of window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          if (tab.input instanceof TabInputWebview) {
            // Detect webview provided by supported extensions
            if (tab.input.viewType.includes('markdown-preview-enhanced'))
              return 'markdown-preview-enhanced'
          }
        }
      }
      return null
    })()

    // Detect changes
    const newState: ViewObserverState = {
      marpDocument: {
        opening: !!openingMarpEditor,
        editor: openingMarpEditor,
      },
      incompatiblePreview: {
        opening: !!incompatiblePreview,
        type: incompatiblePreview,
      },
    }

    if (
      !this.#state ||
      this.#state.marpDocument.opening !== newState.marpDocument.opening ||
      this.#state.incompatiblePreview.opening !==
        newState.incompatiblePreview.opening
    ) {
      this.emit('change', { observer: this, state: newState })
    }

    this.#state = newState
  }
}

const OPEN_MARKDOWN_PREVIEW_BY_VS_CODE = 'Open Markdown preview by VS Code'
const DONT_NOTIFY_AGAIN = "Don't notify again"

export const incompatiblePreviewExtensionsObserver = () => {
  const observer = new ViewObserver(1000)

  let shouldNotify = true

  observer.addListener('change', ({ state }) => {
    if (
      state.marpDocument.opening &&
      state.incompatiblePreview.opening &&
      shouldNotify
    ) {
      const provided =
        state.incompatiblePreview.type === null
          ? ''
          : ` provided by ${providedBy[state.incompatiblePreview.type]}`

      window
        .showWarningMessage(
          `The Markdown preview${provided} is not compatible with Marp. To preview Marp slide, please open the Markdown preview provided by VS Code.`,
          OPEN_MARKDOWN_PREVIEW_BY_VS_CODE,
          DONT_NOTIFY_AGAIN,
        )
        .then(async (selected) => {
          if (
            selected === OPEN_MARKDOWN_PREVIEW_BY_VS_CODE &&
            state.marpDocument.editor
          ) {
            if (window.visibleTextEditors.includes(state.marpDocument.editor)) {
              await window.showTextDocument(
                state.marpDocument.editor.document,
                state.marpDocument.editor.viewColumn,
              )
            }
            await commands.executeCommand(
              'markdown.showPreviewToSide',
              state.marpDocument.editor.document.uri,
            )
          } else if (selected === DONT_NOTIFY_AGAIN) {
            shouldNotify = false
          }
        })
    }
  })

  observer.start()

  return observer
}
