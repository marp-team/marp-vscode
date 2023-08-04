import {
  CodeAction,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  DiagnosticSeverity,
  Disposable,
  languages,
  Position,
  Range,
  TextDocument,
  workspace,
  WorkspaceEdit,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import { mathTypesettingConfiguration } from '../utils'

interface DefineMathGlobalDirectiveDiagnostic extends Diagnostic {
  frontMatterRange: Range
  mathSetting: string
}

interface DefineMathGlobalDirectiveDiagnosticContext {
  mathDirective: boolean
  firstMathRange: Range | undefined
  frontMatterRange: Range | undefined
}

const isDefineMathGlobalDirectiveDiagnostic = (
  diag: Diagnostic,
): diag is DefineMathGlobalDirectiveDiagnostic =>
  diag.source === 'marp-vscode' &&
  diag.code === code &&
  !!diag['mathSetting'] &&
  !!diag['frontMatterRange']

export const code = 'define-math-global-directive'

export function register(
  directiveParser: DirectiveParser,
  diagnostics: Diagnostic[],
) {
  const mathSetting = mathTypesettingConfiguration()

  if (mathSetting !== 'off') {
    let context: DefineMathGlobalDirectiveDiagnosticContext

    directiveParser.on('startParse', () => {
      context = {
        mathDirective: false,
        firstMathRange: undefined,
        frontMatterRange: undefined,
      }
    })

    directiveParser.on('directive', ({ info }) => {
      if (info?.name === 'math') context.mathDirective = true
    })

    directiveParser.on('frontMatter', ({ range }) => {
      context.frontMatterRange = range
    })

    directiveParser.on('maybeMath', ({ body, range }) => {
      if (context.firstMathRange) return

      const leadingDollars = body.match(/^\$+/)

      if (leadingDollars) {
        context.firstMathRange = range.with({
          end: range.start.translate({
            characterDelta: leadingDollars[0].length,
          }),
        })
      }
    })

    directiveParser.on('endParse', () => {
      if (
        !context.mathDirective &&
        context.firstMathRange &&
        context.frontMatterRange
      ) {
        const diagnostic: DefineMathGlobalDirectiveDiagnostic = Object.assign(
          new Diagnostic(
            context.firstMathRange,
            `Whenever using math syntax in Marp, recommend to declare math typesetting library in current document by defining math global directive.`,
            DiagnosticSeverity.Warning,
          ),
          {
            code,
            mathSetting,
            frontMatterRange: context.frontMatterRange,
            source: 'marp-vscode',
          },
        )

        diagnostics.push(diagnostic)
      }
    })
  }
}

export class DefineMathGlobalDirective implements CodeActionProvider {
  static readonly providedCodeActionKinds = [CodeActionKind.QuickFix]

  readonly provideCodeActions: CodeActionProvider['provideCodeActions'] = (
    doc,
    _,
    context,
  ) =>
    context.diagnostics
      .filter(isDefineMathGlobalDirectiveDiagnostic)
      .map((d) => this.createCodeAction(d, doc))

  private createCodeAction(
    diag: DefineMathGlobalDirectiveDiagnostic,
    doc: TextDocument,
  ): CodeAction {
    const act = new CodeAction(
      `Define math global directive as "${diag.mathSetting}"`,
      CodeActionKind.QuickFix,
    )

    act.diagnostics = [diag]
    act.edit = new WorkspaceEdit()
    act.edit.insert(
      doc.uri,
      new Position(diag.frontMatterRange.end.line, 0),
      `math: ${diag.mathSetting}\n`,
    )
    act.isPreferred = true

    return act
  }
}

export function subscribe(subscriptions: Disposable[], refresh: () => void) {
  subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdown.marp.mathTypesetting')) refresh()
    }),

    languages.registerCodeActionsProvider(
      'markdown',
      new DefineMathGlobalDirective(),
      {
        providedCodeActionKinds:
          DefineMathGlobalDirective.providedCodeActionKinds,
      },
    ),
  )
}
