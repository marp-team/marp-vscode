import { window } from 'vscode'

export const command = 'markdown.marp.export'

export default function exportCommand() {
  window.showErrorMessage('Export command cannot run on the browser.')
}
