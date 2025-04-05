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
    input: { outputFilePath },
  }: vscode.LanguageModelToolInvocationPrepareOptions<ExportMarpToolParams>) {
    return {
      invocationMessage: 'Export Marp slide deck',
      confirmationMessages: {
        title: 'Export Marp slide deck',
        message: new vscode.MarkdownString(
          `Are you sure you want to export the Marp slide deck to **${outputFilePath}**?`,
        ),
      },
    }
  }

  async invoke({
    input: { inputFilePath, outputFilePath },
  }: vscode.LanguageModelToolInvocationOptions<ExportMarpToolParams>) {
    const inputUri = vscode.Uri.file(inputFilePath)
    const outputUri = vscode.Uri.file(outputFilePath)

    const result = await doExport(
      outputUri,
      await vscode.workspace.openTextDocument(inputUri),
    ).catch((error) => ({
      uri: outputUri,
      error:
        error instanceof Error ? error.message : `Unknown error (${error})`,
    }))

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        result.error
          ? `Marp for VS Code extension has been tried to export the slide deck but failed. Following is the error message:\n\n${result.error}`
          : `The Marp slide deck has been correctly exported to "${result.uri.toString()}".`,
      ),
    ])
  }
}
