import { window } from 'vscode'

export const command = 'markdown.marp.export'
export const commandAs = 'markdown.marp.exportAs'
export const commandQuick = 'markdown.marp.exportQuick'
export const commandToSelectedFormat = 'markdown.marp.exportToSelectedFormat'

export function exportCommandAs() {
  window.showErrorMessage(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}

export function exportCommandQuick() {
  window.showErrorMessage(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}

export function exportCommandToSelectedFormat() {
  window.showErrorMessage(
    'Export command cannot run with the Web extension. Please consider to use full-featured extension of Marp with any one of locally-installed VS Code, VS Code Server, or GitHub Codespaces.',
  )
}
