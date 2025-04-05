import * as vscode from 'vscode'
import { doExport } from '../../commands/export'

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
    const result = await doExport(
      vscode.Uri.file(outputFilePath),
      await vscode.workspace.openTextDocument(vscode.Uri.file(inputFilePath)),
    )

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        result.error
          ? `Marp for VS Code extension has been tried to export the slide deck but failed. Following is the error message:\n\n${result.error}`
          : `The Marp slide deck has been correctly exported to "${result.uri.toString()}".`,
      ),
    ])
  }
}
