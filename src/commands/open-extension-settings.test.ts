import { commands } from 'vscode'
import openExtensionSettings from './open-extension-settings'

jest.mock('vscode')

describe('openExtensionSettings command', () => {
  it('executes "workbench.action.openSettings" command with filter for Marp extension', async () => {
    await openExtensionSettings()

    expect(commands.executeCommand).toBeCalledWith(
      'workbench.action.openSettings',
      '@ext:marp-team.marp-vscode'
    )
  })
})
