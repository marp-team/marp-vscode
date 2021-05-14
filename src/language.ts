import lodashDebounce from 'lodash.debounce'
import {
  languages,
  window,
  workspace,
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  Disposable,
  Hover,
  MarkdownString,
  Range,
  TextDocument,
  ThemeColor,
} from 'vscode'
import {
  DirectiveParser,
  DirectiveInfo,
  DirectiveDefinedIn,
  DirectiveType,
} from './directive-parser'
import themes from './themes'
import { detectMarpDocument } from './utils'

interface ParsedDirective {
  info: DirectiveInfo
  keyRange: Range
  range: Range
}

interface ParsedData {
  commentRanges: Range[]
  directvies: ParsedDirective[]
  docVersion: number
  frontMatterRange?: Range
}

const waitForDebounce = 150

export function register(subscriptions: Disposable[]) {
  let activeEditor = window.activeTextEditor

  const marpDirectiveKeyDecoration = window.createTextEditorDecorationType({
    fontWeight: 'bold',
    color: new ThemeColor('marp.directiveKeyForeground'),
  })
  const marpGlobalDirectiveKeyDecoration =
    window.createTextEditorDecorationType({ fontStyle: 'italic' })

  const parsed = new Map<TextDocument, ParsedData>()
  const parseFuncs = new Map<TextDocument, () => void>()

  const remove = (doc: TextDocument) => {
    parsed.delete(doc)

    if (activeEditor?.document === doc) {
      activeEditor.setDecorations(marpDirectiveKeyDecoration, [])
      activeEditor.setDecorations(marpGlobalDirectiveKeyDecoration, [])
    }
  }

  const update = (doc: TextDocument) => {
    if (detectMarpDocument(doc)) {
      const parse =
        parseFuncs.get(doc) ??
        (() => {
          const parseFunc = lodashDebounce(() => {
            if (!detectMarpDocument(doc)) return

            const parser = new DirectiveParser()

            const directvies: ParsedDirective[] = []
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
              .parse(doc)

            parsed.set(doc, {
              directvies,
              frontMatterRange,
              commentRanges: commentRanges,
              docVersion: doc.version,
            })

            if (activeEditor?.document === doc) {
              activeEditor.setDecorations(
                marpDirectiveKeyDecoration,
                directvies.map(({ keyRange }) => keyRange)
              )
              activeEditor.setDecorations(
                marpGlobalDirectiveKeyDecoration,
                directvies
                  .filter((d) => d.info.type === DirectiveType.Global)
                  .map(({ keyRange }) => keyRange)
              )
            }
          }, waitForDebounce)

          parseFuncs.set(doc, parseFunc)
          return parseFunc
        })()

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
        for (const collected of parsed.get(doc)?.directvies ?? []) {
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
    languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: async (doc, pos) => {
        if (!detectMarpDocument(doc)) return null

        // Get parsed data
        let parsedData = parsed.get(doc)
        if (!parsedData || parsedData.docVersion !== doc.version) {
          // Try to wait for deboucned parsing
          await new Promise((res) => setTimeout(res, waitForDebounce + 25))
          parsedData = parsed.get(doc)
        }

        if (!parsedData) return null

        // Detect if the current position is acceptable for Marp directives
        for (const { range, definedIn } of [
          {
            definedIn: DirectiveDefinedIn.FrontMatter,
            range: parsedData.frontMatterRange,
          },
          ...parsedData.commentRanges.map((range) => ({
            definedIn: DirectiveDefinedIn.Comment,
            range,
          })),
        ]) {
          if (range?.contains(pos)) {
            // Theme suggestion
            if (doc.getWordRangeAtPosition(pos, /\btheme\s*:\s{1,}[\w-]*\s*/)) {
              const themeSet = themes.getMarpThemeSetFor(doc)

              return new CompletionList(
                [...themeSet.themes()].map(
                  (theme): CompletionItem => ({
                    detail: 'Marp theme',
                    kind: CompletionItemKind.EnumMember,
                    label: theme.name,
                  })
                )
              )
            }

            // Boolean
            if (
              doc.getWordRangeAtPosition(pos, /\b_?paginate\s*:\s{1,}[\w-]*\s*/)
            ) {
              return new CompletionList([
                {
                  detail: 'Boolean',
                  kind: CompletionItemKind.EnumMember,
                  label: 'true',
                },
                {
                  detail: 'Boolean',
                  kind: CompletionItemKind.EnumMember,
                  label: 'false',
                },
              ])
            }

            // =====

            // Determine how to completion directive key from the focused word
            let range: Range | undefined
            let generateInsertText = (label: string) => `${label}: `
            let scoped = false

            const wordRange = doc.getWordRangeAtPosition(pos, /\w+/)
            const wordRangeEx = doc.getWordRangeAtPosition(pos, /[\w:]+/)

            if (wordRange || wordRangeEx) {
              range = wordRange ?? new Range(pos, pos)

              const draftWordEx = doc.getText(wordRangeEx)

              if (draftWordEx.startsWith('_')) {
                scoped = true
                range = range.with(range.start.translate(0, 1))

                if (!range.contains(pos)) {
                  const prev = generateInsertText
                  generateInsertText = (l) => `_${prev(l)}`
                }
              }
              if (draftWordEx.endsWith(':')) {
                const prev = generateInsertText
                generateInsertText = (l) => prev(l).slice(0, -2)
              }
            }

            return new CompletionList(
              DirectiveParser.builtinDirectives
                .filter((d) => {
                  if (scoped && d.type !== DirectiveType.Local) return false
                  return d.allowed.includes(definedIn)
                })
                .map(
                  (d): CompletionItem => ({
                    detail: `${d.type} directive${scoped ? ' [Scoped]' : ''}`,
                    documentation: new MarkdownString(
                      d.description + '\n\n' + d.markdownDetails.value,
                      true
                    ),
                    insertText: generateInsertText(d.name),
                    kind: CompletionItemKind.Property,
                    label: d.name,
                    range,
                  })
                )
            )
          }
        }
        return null
      },
    }),
    marpDirectiveKeyDecoration,
    marpGlobalDirectiveKeyDecoration,
    {
      dispose() {
        parsed.clear()
        parseFuncs.clear()
      },
    }
  )
}

export default register
