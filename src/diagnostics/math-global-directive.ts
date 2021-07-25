import {
  Diagnostic,
  DiagnosticSeverity,
  Disposable,
  Range,
  TextDocument,
  workspace,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import { marpConfiguration } from '../utils'

interface ParsedMathDirective {
  range: Range
}

export const code = 'math-global-directive'

export function register(
  doc: TextDocument,
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[]
) {
  const mathSetting = marpConfiguration().get<string>('mathTypesetting')

  if (mathSetting === 'off') {
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
            doc.positionAt(end + offset)
          ),
        }
      }
    })

    directiveParser.on('endParse', () => {
      if (mathDirective) {
        const diagnostic = new Diagnostic(
          mathDirective.range,
          `A setting by math global directive will be ignored due to disabled math typesetting.`,
          DiagnosticSeverity.Warning
        )

        diagnostic.source = 'marp-vscode'
        diagnostic.code = code

        diagnostics.push(diagnostic)
      }
    })
  } else {
    // TODO: Add recommendation to define math global directive to declare used library if math syntax is used in current Markdown
  }
}

export function subscribe(subscriptions: Disposable[], refresh: () => void) {
  subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdown.marp.mathTypesetting')) refresh()
    })
  )
}
