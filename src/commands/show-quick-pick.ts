import { commands, QuickPickItem, window } from 'vscode'
import { contributes } from '../../package.json'

const availableCommands: QuickPickItem[] = []

for (const command of contributes.commands) {
  if (command.command === 'markdown.marp.showQuickPick') continue

  availableCommands.push({
    label: command.title,
    description: command.command,
  })
}

export default async function showQuickPick() {
  const command = await window.showQuickPick(availableCommands, {
    matchOnDescription: true,
    placeHolder: 'Select available command in Marp for VS Code...',
  })

  if (command && command.description) {
    await commands.executeCommand(command.description)
  }
}
