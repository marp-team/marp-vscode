import { Marp } from '@marp-team/marp-core'
import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from 'vscode'
import { DirectiveParser } from '../directive-parser'
import themes, { Themes } from '../themes'

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
    if (info?.name === 'theme') {
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
    if (parsed) {
      const marp = new Marp()

      for (const { css } of themes.getRegisteredStyles(
        Themes.resolveBaseDirectoryForTheme(doc)
      )) {
        try {
          marp.themeSet.add(css)
        } catch (e) {
          // no ops
        }
      }

      if (!marp.themeSet.has(parsed.value)) {
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
