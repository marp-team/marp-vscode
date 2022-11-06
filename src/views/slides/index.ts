import {
  Disposable,
  TextEditor,
  WebviewView,
  WebviewViewProvider,
} from 'vscode'
import { getLanguageParser, type LanguageParser } from '../../language/parser'
import { onShouldRefresh } from '../../option'
import { detectMarpDocument } from '../../utils'
import type { ViewContext } from '../index'
import { page } from './page'

export interface SlideViewState {
  enabled?: boolean
}

export class SlidesView implements WebviewViewProvider {
  static viewType = 'marp-vscode.slidesView' as const

  private readonly languageParser: LanguageParser

  private internalSubscriptions: Disposable[] = []
  private view?: WebviewView

  #_targetEditorNext: TextEditor | undefined | false = false

  private _targetEditor?: TextEditor
  private get targetEditor() {
    return this._targetEditor
  }
  private set targetEditor(editor) {
    this._targetEditor = editor

    if (this.#_targetEditorNext === false) {
      queueMicrotask(() => {
        const next = this.#_targetEditorNext

        this.#_targetEditorNext = false
        if (next !== false) this.updateStateFromEditor(next)
      })
    }

    this.#_targetEditorNext = editor
  }

  constructor(readonly viewContext: ViewContext) {
    this.languageParser = getLanguageParser()

    viewContext.subscriptions.push(
      new Disposable(() =>
        Disposable.from(...this.internalSubscriptions).dispose()
      )
    )
  }

  resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
    this.view = webviewView

    this.view.webview.options = {
      enableScripts: true,
    }
    this.view.webview.html = page()

    // Track active editor
    const onActiveEditorUpdated = (editor: TextEditor) => {
      this.targetEditor = editor
    }
    const onActiveEditorDisposed = () => {
      this.targetEditor = undefined
    }
    this.languageParser.on('activeEditorUpdated', onActiveEditorUpdated)
    this.languageParser.on('activeEditorDisposed', onActiveEditorDisposed)

    this.internalSubscriptions.push(
      onShouldRefresh(() => this.updateState()),
      webviewView.onDidChangeVisibility(() => {
        console.log('change visibillity')
        if (webviewView.visible) this.updateStateFromEditor()
      }),
      new Disposable(() => {
        this.languageParser.off('activeEditorUpdated', onActiveEditorUpdated)
        this.languageParser.off('activeEditorDisposed', onActiveEditorDisposed)
      })
    )

    this.targetEditor = this.languageParser.activeEditor
  }

  private updateStateFromEditor(
    editor: TextEditor | undefined = this.targetEditor
  ) {
    const enabled = editor ? detectMarpDocument(editor.document) : false

    this.updateState({ enabled })
  }

  private async updateState(updateStates: Partial<SlideViewState> = {}) {
    await this.view?.webview?.postMessage({
      type: 'updateState',
      opts: updateStates,
    })
  }
}
