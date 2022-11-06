import { Uri, type Webview } from 'vscode'

export const resolveWebViewResoruce = (
  webView: Webview,
  extensionUri: Uri,
  ...restPath: string[]
) => webView.asWebviewUri(Uri.joinPath(extensionUri, ...restPath))
