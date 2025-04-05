import path from 'node:path'
import * as vscode from 'vscode'
import { doExport } from '../../commands/export'

export const id = 'export_marp' as const

export interface ExportMarpToolParams {
  inputFilePath: string
  outputFilePath: string
}

export class ExportMarpTool
  implements vscode.LanguageModelTool<ExportMarpToolParams>
{
  prepareInvocation({
    input: { inputFilePath, outputFilePath },
  }: vscode.LanguageModelToolInvocationPrepareOptions<ExportMarpToolParams>) {
    return {
      invocationMessage: 'Export Marp Slide Deck',
      confirmationMessages: {
        title: 'Export Marp Slide Deck',
        message: new vscode.MarkdownString(
          `Export "${path.basename(inputFilePath)}" to **"${outputFilePath}"**.`,
        ),
      },
    }
  }

  async invoke({
    input: { inputFilePath, outputFilePath },
  }: vscode.LanguageModelToolInvocationOptions<ExportMarpToolParams>) {
    if (!vscode.workspace.isTrusted) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Export cannot be performed in a not trusted workspace.',
        ),
      ])
    }

    const inputUri = vscode.Uri.file(inputFilePath)
    const outputUri = vscode.Uri.file(outputFilePath)

    const result = await doExport(
      outputUri,
      await vscode.workspace.openTextDocument(inputUri),
    ).catch((error) => ({
      uri: outputUri,
      error:
        error instanceof Error
          ? error.message
          : `Unknown error (${String(error)})`,
    }))

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        result.error
          ? `The export process failed. Error details:\n\n${result.error}`
          : `The slide deck was successfully exported to "${result.uri.toString()}".`,
      ),
    ])
  }
}
