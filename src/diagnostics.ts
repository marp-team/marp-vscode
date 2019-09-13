import lodashDebounce from 'lodash.debounce'
import rehypeParse from 'rehype-parse'
import remarkParse from 'remark-parse'
import unified from 'unified'
import visit from 'unist-util-visit' // tslint:disable-line: import-name
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

const parseHtml = unified().use(rehypeParse).parse
const parseMd = unified().use(remarkParse, { commonmark: true }).parse
const parseYaml = (yamlBody: string) =>
  yaml.parseDocument(yamlBody, { schema: 'failsafe' })

export const collection = languages.createDiagnosticCollection('marp-vscode')

const setDiagnostics = lodashDebounce((doc: TextDocument) => {
  const diagnostics: Diagnostic[] = []

  warnDeprecatedDollarPrefix(doc, diagnostics)

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
  let markdown = doc.getText()
  let index = 0

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
    const { contents, errors } = parseYaml(text)

    if (errors.length === 0 && contents && contents['items']) {
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
  }

  // Front-matter
  const fmMatched = markdown.match(frontMatterRegex)

  if (fmMatched && fmMatched.index === 0) {
    const [, open, body, close] = fmMatched
    detectDirectives(body, open.length)

    index = open.length + body.length + close.length
    markdown = markdown.slice(index)
  }

  // HTML comments
  visit(parseMd(markdown), 'html', (n: any) =>
    visit(parseHtml(n.value), 'comment', (c: any) =>
      detectDirectives(
        c.value.trim(),
        index +
          n.position.start.offset +
          4 +
          (c.value.length - c.value.trimLeft().length)
      )
    )
  )
}

export default subscribe
