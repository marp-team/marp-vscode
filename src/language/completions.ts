import {
  languages,
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  Disposable,
  MarkdownString,
  Position,
  Range,
  TextDocument,
} from 'vscode'
import {
  DirectiveDefinedIn,
  DirectiveParser,
  DirectiveType,
} from '../directives/parser'
import themes from '../themes'
import { LanguageParser, LanguageParseData } from './parser'

const getCompletionTarget = (
  position: Position,
  data: LanguageParseData
): DirectiveDefinedIn | undefined => {
  if (data.frontMatterRange?.contains(position)) {
    return DirectiveDefinedIn.FrontMatter
  }

  for (const commentRange of data.commentRanges) {
    if (commentRange.contains(position)) return DirectiveDefinedIn.Comment
  }
}

export function register(subscriptions: Disposable[], parser: LanguageParser) {
  subscriptions.push(
    languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: async (doc, pos) => {
        const data = await parser.getParseData(doc, true)
        if (!data) return

        const definedIn = getCompletionTarget(pos, data)
        if (!definedIn) return

        const provider = new CompletionProvider(doc, pos, data, definedIn)
        return provider.getCompletionList()
      },
    })
  )
}

class CompletionProvider {
  constructor(
    private readonly document: TextDocument,
    private readonly position: Position,
    private readonly data: LanguageParseData,
    private readonly definedIn: DirectiveDefinedIn
  ) {}

  getCompletionList() {
    return (
      this.completionThemes() ||
      this.completionBoolean() ||
      this.completionDirectives()
    )
  }

  private completionThemes() {
    if (this.isCursorOnDirective('theme')) {
      const themeSet = themes.getMarpThemeSetFor(this.document)

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
  }

  private completionBoolean() {
    if (this.isCursorOnDirective('paginate', DirectiveType.Local)) {
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
  }

  private completionDirectives() {
    // Determine how to completion directive key from the focused word
    let range: Range | undefined
    let scoped = false
    let generateInsertText = (label: string) => `${label}: `

    const wordRange = this.document.getWordRangeAtPosition(this.position, /\w+/)
    const wordRangeWithColon = this.document.getWordRangeAtPosition(
      this.position,
      /[\w:]+/
    )

    if (wordRange || wordRangeWithColon) {
      // Set a range for replacing the focused word
      // (or for insertion to the current position if not focused a word)
      range = wordRange ?? new Range(this.position, this.position)

      const probablyDirectiveKey = this.document.getText(wordRangeWithColon)

      if (probablyDirectiveKey.startsWith('_')) {
        // Scoped prefix should not replace
        range = range.with(range.start.translate(0, 1))
        scoped = true

        // Updated range will not work if the current position is out of range
        if (!range.contains(this.position)) {
          // Include underscore prefix to auto-insertion
          const prev = generateInsertText
          generateInsertText = (l) => `_${prev(l)}`
        }
      }

      if (probablyDirectiveKey.endsWith(':')) {
        // Remove auto-insertion of colon
        const prev = generateInsertText
        generateInsertText = (l) => prev(l).slice(0, -2)
      }
    }

    return new CompletionList(
      DirectiveParser.builtinDirectives
        .filter((d) => {
          // Suggest only local directives if supposed scoping
          if (scoped && d.type !== DirectiveType.Local) return false

          return d.allowed.includes(this.definedIn)
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

  private isCursorOnDirective(name: string, type = DirectiveType.Global) {
    const scoped = type === DirectiveType.Local ? '_?' : ''
    const regex = new RegExp(`\\b${scoped}${name}\\s*:\\s{1,}[\\w-]*\\s*`)

    return !!this.document.getWordRangeAtPosition(this.position, regex)
  }
}

export default register
