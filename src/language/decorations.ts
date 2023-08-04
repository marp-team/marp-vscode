import { window, Disposable, Range, TextEditor, ThemeColor } from 'vscode'

interface DecorationOption {
  directiveKeys: Range[]
  globalDirectiveKeys: Range[]
}

const marpDirectiveKeyDecoration = window.createTextEditorDecorationType({
  fontWeight: 'bold',
  color: new ThemeColor('marp.directiveKeyForeground'),
})

const marpGlobalDirectiveKeyDecoration = window.createTextEditorDecorationType({
  fontStyle: 'italic',
})

export function registerDecorations(subscriptions: Disposable[]) {
  subscriptions.push(
    marpDirectiveKeyDecoration,
    marpGlobalDirectiveKeyDecoration,
  )
}

export function setDecorations(editor: TextEditor, option: DecorationOption) {
  editor.setDecorations(marpDirectiveKeyDecoration, option.directiveKeys)
  editor.setDecorations(
    marpGlobalDirectiveKeyDecoration,
    option.globalDirectiveKeys,
  )
}

export function removeDecorations(editor: TextEditor) {
  setDecorations(editor, {
    directiveKeys: [],
    globalDirectiveKeys: [],
  })
}
