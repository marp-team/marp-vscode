import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from 'vscode'
import { DirectiveParser } from '../directives/parser'
import themes from '../themes'

interface ParsedThemeValue {
  value: string
  range: Range
}

export const code = 'unknown-theme'

export function register(
  doc: TextDocument,
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[]
) {
  let parsed: ParsedThemeValue | undefined

  directiveParser.on('startParse', () => {
    parsed = undefined
  })

  directiveParser.on('directive', ({ item, offset, info }) => {
    if (info?.name === 'theme' && item.value?.range) {
      const [start, end] = item.value.range

      parsed = {
        value: item.value.value,
        range: new Range(
          doc.positionAt(start + offset),
          doc.positionAt(end + offset)
        ),
      }
    }
  })

  directiveParser.on('endParse', () => {
    if (
      parsed &&
      (parsed.value || !parsed.range.start.isEqual(parsed.range.end))
    ) {
      const themeSet = themes.getMarpThemeSetFor(doc)

      if (!themeSet.has(parsed.value)) {
        const diagnostic = new Diagnostic(
          parsed.range,
          `The specified theme "${parsed.value}" is not recognized by Marp for VS Code.`,
          DiagnosticSeverity.Warning
        )

        diagnostic.source = 'marp-vscode'
        diagnostic.code = code

        diagnostics.push(diagnostic)
      }
    }
  })
}
