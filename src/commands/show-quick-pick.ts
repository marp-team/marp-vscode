import { commands, QuickPickItem, window } from 'vscode'
import { contributes } from '../../package.json'
import { command as exportCommand } from './export'
import { command as toggleMarpPreviewCommand } from './toggle-marp-preview'
import { command as openExtensionSettingsCommand } from './open-extension-settings'

const cmdSymbol = Symbol()
const contributedCommands = [exportCommand, toggleMarpPreviewCommand]
const availableCommands: (QuickPickItem & { [cmdSymbol]: string })[] = []

for (const cmdPath of contributedCommands) {
  const cmd = contributes.commands.find(({ command }) => cmdPath === command)

  if (cmd) {
    availableCommands.push({
      [cmdSymbol]: cmdPath,
      description: cmdPath,
      label: cmd.title,
    })
  }
}

availableCommands.push({
  label: '$(settings-gear) Open extension settings',
  [cmdSymbol]: openExtensionSettingsCommand,
})

export const command = 'markdown.marp.showQuickPick'

export default async function showQuickPick() {
  const command = await window.showQuickPick(availableCommands, {
    matchOnDescription: true,
    placeHolder: 'Select available command in Marp for VS Code...',
  })

  if (command?.[cmdSymbol]) {
    await commands.executeCommand(command[cmdSymbol])
  }
}
