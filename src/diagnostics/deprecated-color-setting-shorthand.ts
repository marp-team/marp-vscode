import colorString from 'color-string'
import {
  CodeAction,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  Disposable,
  TextDocument,
  WorkspaceEdit,
  languages,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'

const diagnosticMeta: unique symbol = Symbol()

interface DeprecatedColorSettingShorthandDiagnostic extends Diagnostic {
  [diagnosticMeta]: { replacement: string }
}

export const code = 'deprecated-color-setting-shorthand'

export function register(
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[],
) {
  directiveParser.on('image', ({ alt, range, url }) => {
    const directive = (() => {
      if (alt === '') return 'color' as const
      if (alt === 'bg') return 'backgroundColor' as const
      return undefined
    })()
    if (directive === undefined) return

    if (colorString.get(url) || url.toLowerCase() === 'currentcolor') {
      const diagnostic = Object.assign(
        new Diagnostic(
          range,
          `Shorthand for setting colors via Markdown image syntax is deprecated, and will be removed in future. Please replace to the scoped local direcitve <!-- _${directive}: "${url}" -->, or consider to use the scoped style.`,
          DiagnosticSeverity.Warning,
        ),
        {
          source: 'marp-vscode',
          code,
          tags: [DiagnosticTag.Deprecated],
          [diagnosticMeta]: {
            replacement: `<!-- _${directive}: "${url}" -->`,
          },
        },
      )

      diagnostics.push(diagnostic)
    }
  })
}

export class DeprecatedColorSettingShorthand implements CodeActionProvider {
  static readonly providedCodeActionKinds = [CodeActionKind.QuickFix]

  readonly provideCodeActions: CodeActionProvider['provideCodeActions'] = (
    doc,
    _,
    context,
  ) =>
    context.diagnostics
      .filter(
        (d): d is DeprecatedColorSettingShorthandDiagnostic =>
          d.source === 'marp-vscode' && d.code === code && d[diagnosticMeta],
      )
      .map((d) => this.createCodeAction(d, doc))

  private createCodeAction(
    diag: DeprecatedColorSettingShorthandDiagnostic,
    doc: TextDocument,
  ): CodeAction {
    const act = new CodeAction(
      `Replace to the scoped local direcitve: ${diag[diagnosticMeta].replacement}`,
      CodeActionKind.QuickFix,
    )

    act.diagnostics = [diag]
    act.edit = new WorkspaceEdit()
    act.edit.replace(doc.uri, diag.range, diag[diagnosticMeta].replacement)
    act.isPreferred = true

    return act
  }
}

export function subscribe(subscriptions: Disposable[]) {
  subscriptions.push(
    languages.registerCodeActionsProvider(
      'markdown',
      new DeprecatedColorSettingShorthand(),
      {
        providedCodeActionKinds:
          DeprecatedColorSettingShorthand.providedCodeActionKinds,
      },
    ),
  )
}
