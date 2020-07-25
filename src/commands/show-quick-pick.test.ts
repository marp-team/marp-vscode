import { commands, window } from 'vscode'
import showQuickPick, { cmdSymbol } from './show-quick-pick'

jest.mock('vscode')

describe('showQuickPick command', () => {
  it('shows quick pick for Marp command', async () => {
    const expectedItem = {
      label: expect.any(String),
      [cmdSymbol]: expect.stringMatching(/^markdown\.marp/),
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
      [cmdSymbol]: 'example.command',
    } as any)

    await showQuickPick()
    expect(commands.executeCommand).toBeCalledWith('example.command')
  })
})
