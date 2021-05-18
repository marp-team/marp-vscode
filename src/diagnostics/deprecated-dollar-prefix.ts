import {
  CodeAction,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  DiagnosticSeverity,
  Disposable,
  Range,
  TextDocument,
  WorkspaceEdit,
  languages,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'

const warnDirectives = [
  // Marpit
  '$headingDivider',
  '$style',
  '$theme',

  // Marp Core
  '$size',
]

export const code = 'deprecated-dollar-prefix'

export function register(
  doc: TextDocument,
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[]
) {
  directiveParser.on('directive', ({ item, offset }) => {
    if (warnDirectives.includes(item.key.value) && item.key.range) {
      const name = item.key.value.slice(1)
      const [start, end] = item.key.range

      const diagnostic = new Diagnostic(
        new Range(doc.positionAt(start + offset), doc.positionAt(end + offset)),
        `Dollar prefix for ${name} global directive is no longer working. Remove "$" to fix.`,
        DiagnosticSeverity.Error
      )

      diagnostic.source = 'marp-vscode'
      diagnostic.code = code

      diagnostics.push(diagnostic)
    }
  })
}

export class RemoveDollarPrefix implements CodeActionProvider {
  static readonly providedCodeActionKinds = [CodeActionKind.QuickFix]

  readonly provideCodeActions: CodeActionProvider['provideCodeActions'] = (
    doc,
    _,
    context
  ) =>
    context.diagnostics
      .filter((d) => d.source === 'marp-vscode' && d.code === code)
      .map((d) => this.createCodeAction(d, doc))

  private createCodeAction(diag: Diagnostic, doc: TextDocument): CodeAction {
    const act = new CodeAction(
      'Remove dollar prefix from global directive',
      CodeActionKind.QuickFix
    )

    act.diagnostics = [diag]
    act.edit = new WorkspaceEdit()
    act.edit.delete(
      doc.uri,
      new Range(diag.range.start, diag.range.start.translate(0, 1))
    )
    act.isPreferred = true

    return act
  }
}

export function subscribe(subscriptions: Disposable[]) {
  subscriptions.push(
    languages.registerCodeActionsProvider(
      'markdown',
      new RemoveDollarPrefix(),
      {
        providedCodeActionKinds: RemoveDollarPrefix.providedCodeActionKinds,
      }
    )
  )
}
