import { commands } from 'vscode'
import pkg from '../../package.json'

export const command = 'markdown.marp.openExtensionSettings'

export default async function openExtensionSettings() {
  await commands.executeCommand(
    'workbench.action.openSettings',
    `@ext:${pkg.publisher}.${pkg.name}`
  )
}
