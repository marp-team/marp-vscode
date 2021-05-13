import { commands, QuickPickItem, window, workspace } from 'vscode'
import { contributes } from '../../package.json'
import { command as exportCommand } from './export'
import { command as openExtensionSettingsCommand } from './open-extension-settings'
import { command as toggleMarpPreviewCommand } from './toggle-marp-preview'

export const cmdSymbol = Symbol()

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

const isTrustedCommand = (cmd: string) => {
  if (!workspace.isTrusted && cmd === exportCommand) return false
  return true
}

export default async function showQuickPick() {
  const command = await window.showQuickPick(
    availableCommands.map((cmd) =>
      isTrustedCommand(cmd[cmdSymbol])
        ? cmd
        : { ...cmd, description: `${cmd.description} $(shield)` }
    ),
    {
      matchOnDescription: true,
      placeHolder: 'Select available command in Marp for VS Code...',
    }
  )

  if (command?.[cmdSymbol]) {
    await commands.executeCommand(command[cmdSymbol])
  }
}
