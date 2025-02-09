import { window } from 'vscode'
import {
  exportCommandAs,
  exportCommandQuick,
  exportCommandToSelectedFormat,
} from './export'

describe('Export commands for web', () => {
  describe('exportCommandAs', () => {
    it('shows warning message', () => {
      exportCommandAs()
      expect(window.showErrorMessage).toHaveBeenCalledWith(expect.any(String))
    })
  })

  describe('exportCommandQuick', () => {
    it('shows warning message', () => {
      exportCommandQuick()
      expect(window.showErrorMessage).toHaveBeenCalledWith(expect.any(String))
    })
  })

  describe('exportCommandToSelectedFormat', () => {
    it('shows warning message', () => {
      exportCommandToSelectedFormat()
      expect(window.showErrorMessage).toHaveBeenCalledWith(expect.any(String))
    })
  })
})
