import lodashDebounce from 'lodash.debounce'
import {
  Diagnostic,
  Disposable,
  TextDocument,
  languages,
  window,
  workspace,
} from 'vscode'
import { DirectiveParser } from '../directive-parser'
import { detectMarpDocument } from '../utils'
import * as deprecatedDollarPrefix from './deprecated-dollar-prefix'
import * as overloadingGlobalDirective from './overloading-global-directive'

export const collection = languages.createDiagnosticCollection('marp-vscode')

const setDiagnostics = lodashDebounce((doc: TextDocument) => {
  const directiveParser = new DirectiveParser()
  const diagnostics: Diagnostic[] = []

  deprecatedDollarPrefix.register(doc, directiveParser, diagnostics)
  overloadingGlobalDirective.register(doc, directiveParser, diagnostics)

  directiveParser.parse(doc)

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
