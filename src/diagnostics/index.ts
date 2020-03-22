import lodashDebounce from 'lodash.debounce'
import {
  Diagnostic,
  Disposable,
  TextDocument,
  languages,
  window,
  workspace,
} from 'vscode'
import * as deprecatedDollarPrefix from './deprecated-dollar-prefix'
import { detectMarpDocument } from '../utils'

export const collection = languages.createDiagnosticCollection('marp-vscode')

const setDiagnostics = lodashDebounce((doc: TextDocument) => {
  const diagnostics: Diagnostic[] = []

  deprecatedDollarPrefix.register(doc, diagnostics)

  collection.set(doc.uri, diagnostics)
}, 500)

export function refresh(doc: TextDocument) {
  if (detectMarpDocument(doc)) {
    setDiagnostics(doc)
  } else {
    collection.delete(doc.uri)
  }
}

export function subscribe(subscriptions: Disposable[]) {
  // Diagnostics
  subscriptions.push(collection)

  // Quick fix
  deprecatedDollarPrefix.subscribe(subscriptions)

  // Initialize observers
  if (window.activeTextEditor) refresh(window.activeTextEditor.document)

  subscriptions.push(
    window.onDidChangeActiveTextEditor((e) => e && refresh(e.document)),
    workspace.onDidChangeTextDocument((e) => refresh(e.document)),
    workspace.onDidCloseTextDocument((d) => collection.delete(d.uri))
  )
}

export default subscribe
