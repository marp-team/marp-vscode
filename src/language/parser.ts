import { EventEmitter } from 'events'
import lodashDebounce from 'lodash.debounce'
import type TypedEmitter from 'typed-emitter'
import {
  Disposable,
  TextDocument,
  TextEditor,
  Range,
  window,
  workspace,
} from 'vscode'
import { DirectiveInfo, DirectiveParser } from '../directive-parser'
import { detectMarpDocument } from '../utils'

export interface LanguageParsedDirective {
  info: DirectiveInfo
  keyRange: Range
  range: Range
}

export interface LanguageParseData {
  commentRanges: Range[]
  directvies: LanguageParsedDirective[]
  frontMatterRange?: Range
  version: number
}

interface LanguageParserEvents {
  activeEditorUpdated: (
    activeEditor: TextEditor,
    parseData: LanguageParseData
  ) => void
  activeEditorDisposed: (activeEditor: TextEditor) => void
}

export class LanguageParser
  extends (EventEmitter as new () => TypedEmitter<LanguageParserEvents>)
  implements Disposable
{
  readonly waitForDebounce = 150

  private _activeEditor: TextEditor | undefined
  private readonly _parseData = new Map<TextDocument, LanguageParseData>()
  private readonly _parseFuncs = new Map<
    TextDocument,
    (() => void) & { cancel: () => void }
  >()

  get activeEditor() {
    return this._activeEditor
  }

  constructor(subscriptions: Disposable[]) {
    super()

    const setActiveEditor = (editor: TextEditor | undefined) => {
      this._activeEditor = editor
      if (editor) this.notifyToParse(editor.document)
    }

    setActiveEditor(window.activeTextEditor)

    subscriptions.push(
      window.onDidChangeActiveTextEditor(setActiveEditor),
      workspace.onDidChangeTextDocument((e) => this.notifyToParse(e.document)),
      workspace.onDidCloseTextDocument((d) => this.disposeDocument(d)),
      this
    )
  }

  dispose() {
    for (const f of this._parseFuncs.values()) f.cancel()

    this._parseFuncs.clear()
    this._parseData.clear()
  }

  async getParseData(
    document: TextDocument,
    ensureLatest = false
  ): Promise<LanguageParseData | undefined> {
    if (!this.isEnabledLanguageFor(document)) return undefined

    let parseData = this._parseData.get(document)

    if (
      ensureLatest &&
      (!parseData || parseData.version !== document.version)
    ) {
      await new Promise((res) => setTimeout(res, this.waitForDebounce + 30))
      parseData = this._parseData.get(document)
    }

    return parseData
  }

  protected isEnabledLanguageFor(document: TextDocument) {
    return detectMarpDocument(document)
  }

  protected parseDocument(document: TextDocument) {
    if (!this.isEnabledLanguageFor(document)) return

    const parser = new DirectiveParser()

    const directvies: LanguageParsedDirective[] = []
    const commentRanges: Range[] = []
    let frontMatterRange: Range | undefined

    parser
      .on('frontMatter', ({ range }) => {
        frontMatterRange = range
      })
      .on('comment', ({ range }) => commentRanges.push(range))
      .on('directive', ({ item, info, offset }) => {
        if (info) {
          const [start, end] = item.key.range
          const [, vEnd] = item.value?.range ?? item.key.range

          directvies.push({
            info,
            keyRange: new Range(
              document.positionAt(start + offset),
              document.positionAt(end + offset)
            ),
            range: new Range(
              document.positionAt(start + offset),
              document.positionAt(vEnd + offset)
            ),
          })
        }
      })
      .parse(document)

    const parseData = {
      commentRanges,
      directvies,
      frontMatterRange,
      version: document.version,
    }

    this._parseData.set(document, parseData)

    if (this._activeEditor?.document === document) {
      this.emit('activeEditorUpdated', this._activeEditor, parseData)
    }
  }

  private notifyToParse(document: TextDocument) {
    if (this.isEnabledLanguageFor(document)) {
      let parseFunc = this._parseFuncs.get(document)

      if (!parseFunc) {
        parseFunc = lodashDebounce(
          () => this.parseDocument(document),
          this.waitForDebounce
        )
        this._parseFuncs.set(document, parseFunc)
      }

      parseFunc()
    } else {
      this.disposeDocument(document)
    }
  }

  private disposeDocument(document: TextDocument) {
    this._parseData.delete(document)

    if (this._activeEditor?.document === document) {
      this.emit('activeEditorDisposed', this._activeEditor)
    }
  }
}
