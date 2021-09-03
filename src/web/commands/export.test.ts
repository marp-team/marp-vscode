import { window } from 'vscode'
import exportCommand from './export'

describe('Export command for web', () => {
  it('shows warning message', () => {
    exportCommand()
    expect(window.showErrorMessage).toHaveBeenCalledWith(expect.any(String))
  })
})
