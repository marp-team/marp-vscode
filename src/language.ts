import lodashDebounce from 'lodash.debounce'
import {
  Disposable,
  Range,
  TextDocument,
  ThemeColor,
  Hover,
  languages,
  window,
  workspace,
} from 'vscode'
import { DirectiveParser, DirectiveInfo } from './directive-parser'
import { detectMarpDocument } from './utils'

interface CollectedDirective {
  info: DirectiveInfo
  keyRange: Range
  range: Range
}

export function register(subscriptions: Disposable[]) {
  let activeEditor = window.activeTextEditor

  const marpDirectiveDecoration = window.createTextEditorDecorationType({
    fontWeight: 'bold',
    color: new ThemeColor('marp.directiveKeyForeground'),
  })

  const directivesByTextDocument = new Map<TextDocument, CollectedDirective[]>()
  const parseFuncByTextDocument = new Map<TextDocument, () => void>()

  const remove = (doc: TextDocument) => {
    directivesByTextDocument.delete(doc)

    if (activeEditor?.document === doc) {
      activeEditor.setDecorations(marpDirectiveDecoration, [])
    }
  }

  const update = (doc: TextDocument) => {
    if (detectMarpDocument(doc)) {
      const parse =
        parseFuncByTextDocument.get(doc) ??
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        parseFuncByTextDocument
          .set(
            doc,
            lodashDebounce(() => {
              if (!detectMarpDocument(doc)) return

              const parser = new DirectiveParser()
              const collected: CollectedDirective[] = []

              parser.on('directive', ({ item, info, offset }) => {
                if (info) {
                  const [start, end] = item.key.range
                  const [, vEnd] = item.value.range

                  collected.push({
                    info,
                    keyRange: new Range(
                      doc.positionAt(start + offset),
                      doc.positionAt(end + offset)
                    ),
                    range: new Range(
                      doc.positionAt(start + offset),
                      doc.positionAt(vEnd + offset)
                    ),
                  })
                }
              })
              parser.parse(doc)

              directivesByTextDocument.set(doc, collected)

              if (activeEditor?.document === doc) {
                activeEditor.setDecorations(
                  marpDirectiveDecoration,
                  collected.map(({ keyRange }) => keyRange)
                )
              }
            }, 200)
          )
          .get(doc)!

      parse()
    } else {
      remove(doc)
    }
  }

  if (activeEditor) update(activeEditor.document)

  subscriptions.push(
    window.onDidChangeActiveTextEditor((e) => {
      activeEditor = e
      if (activeEditor) update(activeEditor.document)
    }),
    workspace.onDidChangeTextDocument((e) => update(e.document)),
    workspace.onDidCloseTextDocument((d) => remove(d)),
    languages.registerHoverProvider('markdown', {
      provideHover: async (doc, pos) => {
        for (const collected of directivesByTextDocument.get(doc) ?? []) {
          if (collected.range.contains(pos)) {
            return new Hover(
              collected.info.markdownDescription,
              collected.range
            )
          }
        }
        return null
      },
    }),
    marpDirectiveDecoration,
    {
      dispose() {
        directivesByTextDocument.clear()
        parseFuncByTextDocument.clear()
      },
    }
  )
}

export default register
