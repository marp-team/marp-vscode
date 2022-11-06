import { type ExtensionContext, window } from 'vscode'
import { SlidesView } from './slides/'

export type ViewContext = Pick<ExtensionContext, 'subscriptions'>

export function register(context: ViewContext) {
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      SlidesView.viewType,
      new SlidesView(context)
    )
  )
}

export default register
