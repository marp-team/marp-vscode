import { window } from 'vscode'
import exportCommand, { doExport } from './export'

describe('Export command for web', () => {
  it('shows warning message', () => {
    exportCommand()
    expect(window.showErrorMessage).toHaveBeenCalledWith(expect.any(String))
  })
})

describe('#doExport for web', () => {
  it('throws error', () => {
    expect(() => doExport()).toThrow()
  })
})
