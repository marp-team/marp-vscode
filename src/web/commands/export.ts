import { window } from 'vscode'

export const command = 'markdown.marp.export'

export default function exportCommand() {
  window.showErrorMessage(
    'Export command cannot run on the Web. Please consider to use the extension in full-featured VS Code such as GitHub Codespaces or locally installed VS Code.'
  )
}
