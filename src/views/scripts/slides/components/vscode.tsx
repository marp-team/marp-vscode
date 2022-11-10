import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeLink,
} from '@vscode/webview-ui-toolkit'

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      'vscode-button': any
      'vscode-link': any
    }
  }
}

export const registerVSCodeButton = () =>
  provideVSCodeDesignSystem().register(vsCodeButton())

export const registerVSCodeLink = () =>
  provideVSCodeDesignSystem().register(vsCodeLink())
