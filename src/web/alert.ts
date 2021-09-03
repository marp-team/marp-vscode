import { env, window, MessageItem, Memento } from 'vscode'

const dontShowAgainKey = 'webExtAlertDontShowAgain' as const

export const continueItem: MessageItem = { title: 'Continue' }
export const dontShowAgainItem: MessageItem = {
  title: "Don't show again",
  isCloseAffordance: true,
}

export const showAlertForWebExtension = async (memento: Memento) => {
  if (env.appHost !== 'web') return
  if (memento.get(dontShowAgainKey)) return

  const ret = await window.showErrorMessage(
    'You are using Marp for VS Code extension on the web.',
    {
      modal: true,
      detail:
        'Marp extension for Web is very early preview. Please note that most of the features are not working correctly.',
    },
    continueItem,
    dontShowAgainItem
  )

  if (ret === dontShowAgainItem) await memento.update(dontShowAgainKey, true)
}
