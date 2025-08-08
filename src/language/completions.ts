import dedent from 'dedent'
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
  data: LanguageParseData,
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
    }),
  )
}

const themeDocs = {
  default: dedent(`
    ![](https://user-images.githubusercontent.com/3993388/48039490-53be1b80-e1b8-11e8-8179-0e6c11d285e2.png)
    ![invert](https://user-images.githubusercontent.com/3993388/48039492-5456b200-e1b8-11e8-9975-c9e4029d9036.png)

    _[See more details...](https://github.com/marp-team/marp-core/tree/main/themes#default)_
  `),
  gaia: dedent(`
    ![](https://user-images.githubusercontent.com/3993388/48039493-5456b200-e1b8-11e8-9c49-dd5d66d76c0d.png)
    ![invert](https://user-images.githubusercontent.com/3993388/48039494-5456b200-e1b8-11e8-8bb5-f4a250e902e1.png)
    ![gaia](https://user-images.githubusercontent.com/3993388/48040059-c62ffb00-e1ba-11e8-8026-fa3511844ec7.png)

    _[See more details...](https://github.com/marp-team/marp-core/tree/main/themes#gaia)_
  `),
  uncover: dedent(`
    ![](https://user-images.githubusercontent.com/3993388/48039495-5456b200-e1b8-11e8-8c82-ca7f7842b34d.png)
    ![invert](https://user-images.githubusercontent.com/3993388/48039496-54ef4880-e1b8-11e8-9c22-f3309b101e3c.png)

    _[See more details...](https://github.com/marp-team/marp-core/tree/main/themes#uncover)_
  `),
} as const

const cliBuiltInTransitions = [
  'clockwise',
  'counterclockwise',
  'cover',
  'coverflow',
  'cube',
  'cylinder',
  'diamond',
  'drop',
  'explode',
  'fade',
  'fade-out',
  'fall',
  'flip',
  'glow',
  'implode',
  'in-out',
  'iris-in',
  'iris-out',
  'melt',
  'overlap',
  'pivot',
  'pull',
  'push',
  'reveal',
  'rotate',
  'slide',
  'star',
  'swap',
  'swipe',
  'swoosh',
  'wipe',
  'wiper',
  'zoom',
] as const

class CompletionProvider {
  constructor(
    private readonly document: TextDocument,
    private readonly position: Position,
    private readonly data: LanguageParseData,
    private readonly definedIn: DirectiveDefinedIn,
  ) {}

  getCompletionList() {
    return (
      this.completionThemes() ||
      this.completionPaginate() ||
      this.completionMath() ||
      this.completionSizePreset() ||
      this.completionBuiltInTransitions() ||
      this.completionDirectives()
    )
  }

  private completionThemes() {
    if (this.isCursorOnDirective('theme')) {
      const themeSet = themes.getMarpThemeSetFor(this.document)

      return new CompletionList(
        [...themeSet.themes()].map((theme): CompletionItem => {
          const docs = themeDocs[theme.name]

          return {
            detail: `Marp ${docs ? 'Core built-in' : 'custom'} theme`,
            kind: CompletionItemKind.EnumMember,
            label: theme.name,
            documentation: docs ? new MarkdownString(docs, true) : undefined,
          }
        }),
      )
    }
  }

  private completionPaginate() {
    if (this.isCursorOnDirective('paginate', DirectiveType.Local)) {
      return new CompletionList([
        {
          detail: 'Keyword for paginate directive',
          kind: CompletionItemKind.EnumMember,
          label: 'true',
          documentation: 'Show the page number.',
        },
        {
          detail: 'Keyword for paginate directive',
          kind: CompletionItemKind.EnumMember,
          label: 'false',
          documentation: 'Hide the page number.',
        },
        {
          detail: 'Keyword for paginate directive',
          kind: CompletionItemKind.EnumMember,
          label: 'skip',
          documentation: 'Hide the page number and prevent its increment.',
        },
        {
          detail: 'Keyword for paginate directive',
          kind: CompletionItemKind.EnumMember,
          label: 'hold',
          documentation:
            'Show the page number, but prevent increment even on the following page(s).',
        },
      ])
    }
  }

  private completionMath() {
    if (this.isCursorOnDirective('math')) {
      return new CompletionList([
        {
          detail: 'MathJax',
          documentation: new MarkdownString(
            'Use [MathJax](https://www.mathjax.org/).',
          ),
          kind: CompletionItemKind.EnumMember,
          label: 'mathjax',
        },
        {
          detail: 'KaTeX',
          documentation: new MarkdownString('Use [KaTeX](https://katex.org/).'),
          kind: CompletionItemKind.EnumMember,
          label: 'katex',
        },
      ])
    }
  }

  private completionSizePreset() {
    if (this.isCursorOnDirective('size')) {
      let theme: string | undefined

      for (const { info, value } of this.data.directives) {
        if (info.name === 'theme' && value) theme = value
      }

      const sizePresets = themes.getSizePresets(this.document, theme)

      if (sizePresets.length > 0) {
        return new CompletionList(
          sizePresets.map((preset) => ({
            detail: 'Marp theme size preset',
            documentation: `${preset.width} X ${preset.height}`,
            kind: CompletionItemKind.EnumMember,
            label: preset.name,
          })),
        )
      }
    }
  }

  private completionBuiltInTransitions() {
    if (this.isCursorOnDirective('transition', DirectiveType.Local)) {
      return new CompletionList([
        {
          documentation: 'Disable the transition effect.',
          kind: CompletionItemKind.EnumMember,
          label: 'none',
        },
        ...cliBuiltInTransitions.map((transition) => ({
          detail: 'Marp CLI built-in transition effect',
          documentation: new MarkdownString(
            `![${transition} transition](https://raw.githubusercontent.com/marp-team/marp-cli/main/docs/bespoke-transitions/images/${transition}.gif)`,
          ),
          kind: CompletionItemKind.EnumMember,
          label: transition,
        })),
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
      /[\w:]+/,
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
              true,
            ),
            insertText: generateInsertText(d.name),
            kind: CompletionItemKind.Property,
            label: d.name,
            range,
            command: d.completable
              ? {
                  command: 'editor.action.triggerSuggest',
                  title: 'Trigger suggest',
                }
              : undefined,
          }),
        ),
    )
  }

  private isCursorOnDirective(name: string, type = DirectiveType.Global) {
    const scoped = type === DirectiveType.Local ? '_?' : ''
    const regex = new RegExp(`\\b${scoped}${name}\\s*:\\s{1,}[\\w-]*\\s*`)

    return !!this.document.getWordRangeAtPosition(this.position, regex)
  }
}

export default register
