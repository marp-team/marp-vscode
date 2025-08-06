import { Diagnostic, DiagnosticSeverity, Position, Range } from 'vscode'
import type { OverflowElementData } from '../../preview/overflow-tracker'

export const code = 'slide-content-overflow'
export const message =
  'The slide content overflows the safe area. Consider reducing the content or splitting it into multiple pages.'

export const generateDiagnostics = (
  overflowElementData: OverflowElementData[],
) =>
  overflowElementData.map(({ startLine, endLine }) => {
    const diagnostic = new Diagnostic(
      new Range(new Position(startLine, 0), new Position(endLine, 0)),
      message,
      DiagnosticSeverity.Warning,
    )

    diagnostic.source = 'marp-vscode'
    diagnostic.code = code

    return diagnostic
  })
