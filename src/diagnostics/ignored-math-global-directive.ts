import {
  Diagnostic,
  DiagnosticSeverity,
  Disposable,
  Range,
  TextDocument,
  workspace,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import { mathTypesettingConfiguration } from '../utils'

interface ParsedMathDirective {
  range: Range
}

export const code = 'ignored-math-global-directive'

export function register(
  doc: TextDocument,
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[],
) {
  if (mathTypesettingConfiguration() === 'off') {
    // Tell the user the thing that math global directive is ignored
    let mathDirective: ParsedMathDirective | undefined

    directiveParser.on('startParse', () => {
      mathDirective = undefined
    })

    directiveParser.on('directive', ({ item, offset, info }) => {
      if (info?.name === 'math' && item.key.range) {
        const [start, end] = item.key.range

        mathDirective = {
          range: new Range(
            doc.positionAt(start + offset),
            doc.positionAt(end + offset),
          ),
        }
      }
    })

    directiveParser.on('endParse', () => {
      if (mathDirective) {
        const diagnostic = new Diagnostic(
          mathDirective.range,
          `A definition of math global directive will be ignored due to disabled math typesetting in VS Code setting.`,
          DiagnosticSeverity.Information,
        )

        diagnostic.source = 'marp-vscode'
        diagnostic.code = code

        diagnostics.push(diagnostic)
      }
    })
  }
}

export function subscribe(subscriptions: Disposable[], refresh: () => void) {
  subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdown.marp.mathTypesetting')) refresh()
    }),
  )
}
