import { languages, Disposable, Hover, Range } from 'vscode'
import { DirectiveType } from '../directives/parser'
import * as completions from './completions'
import * as decorations from './decorations'
import { LanguageParser } from './parser'

export function register(subscriptions: Disposable[]) {
  const languageParser = new LanguageParser(subscriptions)

  // Highlight for directives
  decorations.registerDecorations(subscriptions)

  languageParser
    .on('activeEditorDisposed', decorations.removeDecorations)
    .on('activeEditorUpdated', (editor, { directives }) => {
      const directiveKeys: Range[] = []
      const globalDirectiveKeys: Range[] = []

      for (const { info, keyRange } of directives) {
        directiveKeys.push(keyRange)

        if (info.type === DirectiveType.Global) {
          globalDirectiveKeys.push(keyRange)
        }
      }

      decorations.setDecorations(editor, { directiveKeys, globalDirectiveKeys })
    })

  // Hover help
  subscriptions.push(
    languages.registerHoverProvider('markdown', {
      provideHover: async (doc, pos) => {
        const parsedData = await languageParser.getParseData(doc)

        for (const collected of parsedData?.directives ?? []) {
          if (collected.range.contains(pos)) {
            return new Hover(
              collected.info.markdownDescription,
              collected.range,
            )
          }
        }
      },
    }),
  )

  // Auto completion
  completions.register(subscriptions, languageParser)
}

export default register
