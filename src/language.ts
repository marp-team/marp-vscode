import { languages, Disposable, Range, TextDocument, Hover } from 'vscode'
import { DirectiveParser, DirectiveInfo } from './directive-parser'
import { detectMarpDocument } from './utils'

interface CollectedDirective {
  info: DirectiveInfo
  keyRange: Range
  range: Range
}

export function register(subscriptions: Disposable[]) {
  const collectDirectives = (doc: TextDocument) => {
    if (detectMarpDocument(doc)) {
      const parser = new DirectiveParser()
      const collected: CollectedDirective[] = []

      parser.on('directive', ({ item, info, offset }) => {
        if (info) {
          const [start, end] = item.key.range
          const [, vEnd] = item.value.range

          collected.push({
            info,
            keyRange: new Range(
              doc.positionAt(start + offset),
              doc.positionAt(end + offset)
            ),
            range: new Range(
              doc.positionAt(start + offset),
              doc.positionAt(vEnd + offset)
            ),
          })
        }
      })
      parser.parse(doc)

      return collected
    }
    return []
  }

  subscriptions.push(
    languages.registerHoverProvider('markdown', {
      provideHover: async (doc, pos) => {
        for (const collected of collectDirectives(doc)) {
          if (collected.range.contains(pos)) {
            return new Hover(
              collected.info.markdownDescription,
              collected.range
            )
          }
        }
        return null
      },
    })
  )
}

export default register
