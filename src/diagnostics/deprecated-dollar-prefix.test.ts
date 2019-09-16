import { languages } from 'vscode'
import * as rule from './deprecated-dollar-prefix'

jest.mock('vscode')

describe('[Diagnostics rule] Deprecated dollar prefix', () => {
  describe('#register', () => {
    it.todo('Check document and register diagonstic')
  })

  describe('#subscribe', () => {
    it('subscribes registered RemoveDollarPrefix code action provider', () => {
      const subscriptions: any[] = []
      rule.subscribe(subscriptions)

      expect(languages.registerCodeActionsProvider).toBeCalledWith(
        'markdown',
        expect.any(rule.RemoveDollarPrefix),
        {
          providedCodeActionKinds:
            rule.RemoveDollarPrefix.providedCodeActionKinds,
        }
      )
    })
  })
})
