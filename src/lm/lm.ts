import { lm } from 'vscode'
import type { Disposable } from 'vscode'
import { ExportMarpTool } from './tools/export-marp'

export const registerLM = (subscriptions: Disposable[]) => {
  subscriptions.push(lm.registerTool('export_marp', new ExportMarpTool()))
}
