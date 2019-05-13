import { commands, window, QuickPickItem } from 'vscode'
import showQuickPick from './show-quick-pick'

jest.mock('vscode')

describe('showQuickPick command', () => {
  it('shows quick pick for Marp command', async () => {
    const expectedItem: QuickPickItem = {
      label: expect.any(String),
      description: expect.stringMatching(/^markdown\.marp/),
    }

    await showQuickPick()
    expect(window.showQuickPick).toBeCalledWith(
      expect.arrayContaining([expectedItem]),
      expect.anything()
    )
  })

  it('executes command if selected item has description', async () => {
    jest.spyOn(window, 'showQuickPick').mockResolvedValue({
      label: 'Example command',
      description: 'example.command',
    })

    await showQuickPick()
    expect(commands.executeCommand).toBeCalledWith('example.command')
  })
})
