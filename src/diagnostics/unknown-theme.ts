import path from 'path'
import { Marp } from '@marp-team/marp-core'
import {
  workspace,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  TextDocument,
} from 'vscode'
import { DirectiveParser } from '../directive-parser'
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
      const wsFolder = workspace.getWorkspaceFolder(doc.uri)
      const customThemes = themes.getRegisteredStyles(
        wsFolder?.uri ?? doc.uri.with({ path: path.dirname(doc.fileName) })
      )
      const tmpMarp = new Marp()

      for (const theme of customThemes) {
        try {
          tmpMarp.themeSet.add(theme.css)
        } catch (e) {
          // no ops
        }
      }

      if (!tmpMarp.themeSet.has(parsed.value)) {
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
