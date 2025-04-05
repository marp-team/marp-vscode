import { window } from 'vscode'

export const command = 'markdown.marp.export'

export default function exportCommand() {
  window.showErrorMessage(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}

export const doExport = () => {
  throw new Error(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}
