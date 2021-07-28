import lodashDebounce from 'lodash.debounce'
import {
  Diagnostic,
  Disposable,
  TextDocument,
  languages,
  window,
  workspace,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import { detectMarpDocument } from '../utils'
import * as deprecatedDollarPrefix from './deprecated-dollar-prefix'
import * as ignoredMathGlobalDirective from './ignored-math-global-directive'
import * as overloadingGlobalDirective from './overloading-global-directive'
import * as unknownTheme from './unknown-theme'

export const collection = languages.createDiagnosticCollection('marp-vscode')

const setDiagnostics = lodashDebounce((doc: TextDocument) => {
  const directiveParser = new DirectiveParser()
  const diagnostics: Diagnostic[] = []

  deprecatedDollarPrefix.register(doc, directiveParser, diagnostics)
  ignoredMathGlobalDirective.register(doc, directiveParser, diagnostics)
  overloadingGlobalDirective.register(doc, directiveParser, diagnostics)
  unknownTheme.register(doc, directiveParser, diagnostics)

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
  const refreshActiveTextEditor = () => {
    if (window.activeTextEditor) refresh(window.activeTextEditor.document)
  }

  // Diagnostics
  subscriptions.push(collection)

  // Actions
  deprecatedDollarPrefix.subscribe(subscriptions)
  ignoredMathGlobalDirective.subscribe(subscriptions, refreshActiveTextEditor)

  // Initialize observers
  refreshActiveTextEditor()

  subscriptions.push(
    window.onDidChangeActiveTextEditor((e) => e && refresh(e.document)),
    workspace.onDidChangeTextDocument((e) => refresh(e.document)),
    workspace.onDidCloseTextDocument((d) => collection.delete(d.uri))
  )
}

export default subscribe
