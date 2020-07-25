import { commands } from 'vscode'
import { publisher, name } from '../../package.json'

export const command = 'markdown.marp.openExtensionSettings'

export default async function openExtensionSettings() {
  await commands.executeCommand(
    'workbench.action.openSettings',
    `@ext:${publisher}.${name}`
  )
}
