import type { WebviewApi } from 'vscode-webview'

const acquired = globalThis.acquireVsCodeApi()

export const vscodeApi = <T = unknown>() => acquired as WebviewApi<T>
