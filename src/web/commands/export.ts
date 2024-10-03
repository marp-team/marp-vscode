import { window } from 'vscode'

export const command = 'markdown.marp.export'
export const commandQuick = 'markdown.marp.exportQuick'

export default function exportCommand() {
  window.showErrorMessage(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}

export const quickExportCommand = async() => {
  window.showErrorMessage(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}