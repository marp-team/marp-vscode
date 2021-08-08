import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from 'vscode'
import { DirectiveParser } from '../directives/parser'
import themes from '../themes'

interface ParsedSizeValue {
  theme?: string
  size?: string
  range?: Range
}

export const code = 'unknown-size'

export function register(
  doc: TextDocument,
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[]
) {
  let parsed: ParsedSizeValue = {}

  directiveParser.on('startParse', () => {
    parsed = {}
  })

  directiveParser.on('directive', ({ item, offset, info }) => {
    switch (info?.name) {
      case 'theme':
        if (item.value?.value) parsed.theme = item.value?.value
        break
      case 'size':
        if (item.key.range && item.value?.range) {
          const [start] = item.key.range
          const [, end] = item.value.range

          parsed.size = item.value.value
          parsed.range = new Range(
            doc.positionAt(start + offset),
            doc.positionAt(end + offset)
          )
        }
        break
    }
  })

  directiveParser.on('endParse', () => {
    if (
      parsed.size &&
      parsed.range &&
      !parsed.range.start.isEqual(parsed.range.end)
    ) {
      const sizes = themes
        .getSizePresets(doc, parsed.theme)
        .map(({ name }) => name)

      if (!sizes.includes(parsed.size)) {
        const diagnostic = new Diagnostic(
          parsed.range,
          `A specified size preset "${parsed.size}" will be ignored due to a not defined preset in a used theme.`,
          DiagnosticSeverity.Warning
        )

        diagnostic.source = 'marp-vscode'
        diagnostic.code = code

        diagnostics.push(diagnostic)
      }
    }
  })
}
