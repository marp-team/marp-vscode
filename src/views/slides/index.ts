import Marp from '@marp-team/marp-core'
import type Marpit from '@marp-team/marpit'
import {
  Disposable,
  TextEditor,
  Uri,
  WebviewOptions,
  WebviewView,
  WebviewViewProvider,
} from 'vscode'
import { getLanguageParser, type LanguageParser } from '../../language/parser'
import {
  marpCoreOptionsForSlidesView,
  onChangeDependingConfiguration,
} from '../../option'
import themes, { Themes } from '../../themes'
import { detectMarpDocument } from '../../utils'
import type { ViewContext } from '../index'
import { resolveWebViewResoruce } from '../utils'
import { page } from './page'

export interface SlideViewState {
  enabled?: boolean
  marp?: Marpit.RenderResult<string[]>
}

export class SlidesView implements WebviewViewProvider {
  static viewType = 'marp-vscode.slidesView' as const

  private readonly extensionUri: Uri
  private readonly languageParser: LanguageParser
  private readonly internalSubscriptions: Disposable[] = []

  private view?: WebviewView

  // Target editor management
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

  // ---

  constructor(readonly viewContext: ViewContext) {
    this.extensionUri = viewContext.extensionUri
    this.languageParser = getLanguageParser()

    viewContext.subscriptions.push(
      new Disposable(() =>
        Disposable.from(...this.internalSubscriptions).dispose()
      )
    )
  }

  resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
    this.view = webviewView
    this.view.webview.options = this.webviewOptions()
    this.view.webview.html = page({
      stylePath: `${this.resolveResource('views', 'slides.css')}`,
      scriptPath: `${this.resolveResource('views', 'slides.js')}`,
    })

    // Initialize active editor tracking
    const onActiveEditorUpdated = (editor: TextEditor) => {
      this.targetEditor = editor
    }
    const onActiveEditorDisposed = () => {
      this.targetEditor = undefined
    }
    this.languageParser.on('activeEditorUpdated', onActiveEditorUpdated)
    this.languageParser.on('activeEditorDisposed', onActiveEditorDisposed)

    this.internalSubscriptions.push(
      onChangeDependingConfiguration(() => this.updateState()),
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) this.updateStateFromEditor()
      }),
      new Disposable(() => {
        this.languageParser.off('activeEditorUpdated', onActiveEditorUpdated)
        this.languageParser.off('activeEditorDisposed', onActiveEditorDisposed)
      })
    )

    this.targetEditor = this.languageParser.activeEditor
  }

  private async updateStateFromEditor(
    editor: TextEditor | undefined = this.targetEditor
  ) {
    const updateStates: Partial<SlideViewState> = {
      enabled: editor ? detectMarpDocument(editor.document) : false,
      marp: undefined,
    }

    if (updateStates.enabled && editor) {
      const marp = await this.resolveMarp()
      const rendered = marp.render(editor.document.getText(), {
        htmlAsArray: true,
      })

      updateStates.marp = rendered
    }

    await this.updateState(updateStates)
  }

  private async updateState(updateStates: Partial<SlideViewState> = {}) {
    await this.view?.webview?.postMessage({
      type: 'updateState',
      opts: updateStates,
    })
  }

  private async resolveMarp() {
    const targetDocument = this.targetEditor?.document
    const marp = new Marp(marpCoreOptionsForSlidesView())

    themes
      .loadStyles(
        targetDocument
          ? Themes.resolveBaseDirectoryForTheme(targetDocument)
          : undefined
      )
      .map((promise) =>
        promise.then(({ css }) => {
          try {
            marp.themeSet.add(css)
          } catch (e) {
            // no ops
          }
        })
      )

    return marp
  }

  private resolveResource(...restPath: string[]) {
    if (!this.view) return null

    return resolveWebViewResoruce(
      this.view.webview,
      this.extensionUri,
      ...restPath
    )
  }

  private webviewOptions(): WebviewOptions {
    if (!this.view) return {}

    return {
      enableScripts: true,
      enableForms: false,
    }
  }
}
