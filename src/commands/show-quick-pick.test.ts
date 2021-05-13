import { commands, window, workspace } from 'vscode'
import showQuickPick, { cmdSymbol } from './show-quick-pick'

jest.mock('vscode')

describe('showQuickPick command', () => {
  it('shows quick pick for Marp command', async () => {
    const expectedItem = {
      label: expect.any(String),
      [cmdSymbol]: expect.stringMatching(/^markdown\.marp/),
    }

    await showQuickPick()
    expect(window.showQuickPick).toHaveBeenCalledWith(
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
    expect(commands.executeCommand).toHaveBeenCalledWith('example.command')
  })

  describe('when the current workspace is untrusted', () => {
    beforeEach(() => {
      jest.spyOn(workspace, 'isTrusted', 'get').mockImplementation(() => false)
    })

    it('shows quick pick with restricted items that have shield icon', async () => {
      const expectedItem = expect.objectContaining({
        description: expect.stringContaining('$(shield)'),
      })

      await showQuickPick()
      expect(window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([expectedItem]),
        expect.anything()
      )
    })
  })
})
