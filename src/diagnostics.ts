import {
  Diagnostic,
  DiagnosticSeverity,
  Disposable,
  Range,
  TextDocument,
  languages,
  window,
  workspace,
} from 'vscode'
import yaml from 'yaml'
import { detectMarpDocument, frontMatterRegex } from './utils'

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
  const markdown = doc.getText()
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

  const detectDirectives = (text: string, offset: number = 0) => {
    const { contents } = yaml.parseDocument(text, { schema: 'failsafe' })
    if (!(contents && contents['items'])) return

    for (const item of contents['items']) {
      if (item.type === 'PAIR' && warnDirectives.includes(item.key.value)) {
        const name = item.key.value.slice(1)
        const [start, end] = item.key.range

        diagnostics.push(
          new Diagnostic(
            new Range(
              doc.positionAt(start + offset),
              doc.positionAt(end + offset)
            ),
            `Dollar prefix support for ${name} global directive is deprecated. Remove "$" to fix.`,
            DiagnosticSeverity.Warning
          )
        )
      }
    }
  }

  // Front-matter
  const fmMatched = markdown.match(frontMatterRegex)
  if (fmMatched && fmMatched.index === 0) {
    detectDirectives(fmMatched[2], fmMatched[1].length)
  }

  // TODO: Parse directives in HTML comments
}

export default subscribe
