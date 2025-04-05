import { lm } from 'vscode'
import type { Disposable } from 'vscode'
import * as exportMarp from './tools/export-marp'

export const registerLM = (subscriptions: Disposable[]) => {
  subscriptions.push(
    lm.registerTool(exportMarp.id, new exportMarp.ExportMarpTool()),
  )
}
