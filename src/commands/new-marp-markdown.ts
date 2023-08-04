import { Selection, window, workspace } from 'vscode'

export const command = 'markdown.marp.newMarpMarkdown'

export default async function newMarpMarkdown() {
  const newDocument = await workspace.openTextDocument({
    content: '---\nmarp: true\n---\n\n',
    language: 'markdown',
  })

  const editor = await window.showTextDocument(newDocument)

  editor.selection = new Selection(
    newDocument.positionAt(20),
    newDocument.positionAt(20),
  )
}
