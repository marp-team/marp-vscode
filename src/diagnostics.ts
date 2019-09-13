import {
  Diagnostic,
  Disposable,
  TextDocument,
  languages,
  window,
  workspace,
} from 'vscode'
import { detectMarpDocument } from './utils'

export const collection = languages.createDiagnosticCollection('marp-vscode')

export function refresh(doc: TextDocument) {
  if (detectMarpDocument(doc)) {
    const diagnostics: Diagnostic[] = []

    warnDeprecatedDollarPrefix(doc, diagnostics)

    collection.set(doc.uri, diagnostics)
  } else {
    collection.delete(doc.uri)
  }
}

export function subscribe(subscriptions: Disposable[]) {
  subscriptions.push(collection)

  if (window.activeTextEditor) refresh(window.activeTextEditor.document)

  subscriptions.push(
    window.onDidChangeActiveTextEditor(e => e && refresh(e.document)),
    workspace.onDidChangeTextDocument(e => refresh(e.document)),
    workspace.onDidCloseTextDocument(d => collection.delete(d.uri))
  )
}

function warnDeprecatedDollarPrefix(
  doc: TextDocument,
  diagnostics: Diagnostic[]
) {
  const text = doc.getText()
  const warnDirectives = [
    // Marpit
    '$headingDivider',
    '$style',
    '$theme',

    // Marp Core
    '$size',

    // Marp CLI
    '$description',
    '$image',
    '$title',
    '$url',
  ]

  // TODO: Add diagnostics when detected global directives with dollar prefix
}

export default subscribe
