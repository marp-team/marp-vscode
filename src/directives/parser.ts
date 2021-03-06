import { EventEmitter } from 'events'
import rehypeParse from 'rehype-parse'
import remarkParse from 'remark-parse'
import TypedEmitter from 'typed-emitter'
import unified from 'unified'
import { visit } from 'unist-util-visit'
import { Range, TextDocument } from 'vscode'
import yaml, { Pair, Scalar, YAMLMap } from 'yaml'
import { frontMatterRegex } from '../utils'
import {
  builtinDirectives,
  createDirectiveInfo,
  DirectiveDefinedIn,
  DirectiveInfo,
  DirectiveType,
} from './definitions'

export {
  DirectiveDefinedIn,
  DirectiveInfo,
  DirectiveProvidedBy,
  DirectiveType,
} from './definitions'

const parseHtml = unified().use(rehypeParse).parse
const parseMd = unified().use(remarkParse).parse
const parseYaml = (yamlBody: string) =>
  yaml.parseDocument(yamlBody, { schema: 'failsafe' })

export interface DirectiveEventHandler {
  info?: DirectiveInfo
  item: Pair<Scalar<string>, Scalar<any>>
  offset: number
}

export interface DirectiveSectionEventHandler {
  body: string
  range: Range
}

interface DirectiveParserEvents {
  comment: (event: DirectiveSectionEventHandler) => void
  directive: (event: DirectiveEventHandler) => void
  endParse: (event: { document: TextDocument }) => void
  frontMatter: (event: DirectiveSectionEventHandler) => void
  startParse: (event: { document: TextDocument }) => void
}

export class DirectiveParser extends (EventEmitter as new () => TypedEmitter<DirectiveParserEvents>) {
  static builtinDirectives = builtinDirectives

  directives: DirectiveInfo[] = [...DirectiveParser.builtinDirectives]

  parse(doc: TextDocument) {
    this.emit('startParse', { document: doc })

    let markdown = doc.getText()
    let index = 0

    const detectDirectives = (
      text: string,
      offset: number,
      definedIn = DirectiveDefinedIn.Comment
    ) => {
      const { contents, errors } = parseYaml(text.replace(/\r$/, ''))

      if (errors.length === 0 && contents?.['items']) {
        for (const item of (contents as YAMLMap<Scalar<string>, Scalar<any>>)
          .items) {
          if (item.key && item.value) {
            let scoped: boolean | undefined = undefined

            const directiveInfo = this.directives.find((d) => {
              if (!d.allowed.includes(definedIn)) return false

              if (item.key.value === d.name) return true

              if (
                d.type === DirectiveType.Local &&
                item.key.value === `_${d.name}`
              ) {
                scoped = true
                return true
              }

              return false
            })

            const info = directiveInfo
              ? createDirectiveInfo({ ...directiveInfo, scoped })
              : undefined

            this.emit('directive', { info, item, offset })
          }
        }
      }
    }

    // Front-matter
    const fmMatched = markdown.match(frontMatterRegex)

    if (fmMatched?.index === 0) {
      const [outerBody, open, body, close] = fmMatched
      index = open.length + body.length + close.length

      this.emit('frontMatter', {
        body: outerBody,
        range: new Range(doc.positionAt(0), doc.positionAt(index)),
      })

      detectDirectives(body, open.length, DirectiveDefinedIn.FrontMatter)

      markdown = markdown.slice(index)
    }

    // HTML comments
    visit(parseMd(markdown), 'html', (n: any) => {
      visit(parseHtml(n.value), 'comment', (c: any) => {
        const rawBody = n.value.slice(
          c.position.start.offset,
          c.position.end.offset
        )

        this.emit('comment', {
          body: rawBody,
          range: new Range(
            doc.positionAt(index + n.position.start.offset),
            doc.positionAt(index + n.position.end.offset)
          ),
        })

        // c.value should not use because it has normalized CRLF to LF
        const value = rawBody.slice(4, -3)
        const trimmedLeft = value.replace(/^-*\s*/, '')

        detectDirectives(
          trimmedLeft.replace(/\s*-*$/, ''),
          index +
            n.position.start.offset +
            c.position.start.offset +
            4 +
            (value.length - trimmedLeft.length)
        )
      })
    })

    this.emit('endParse', { document: doc })
  }
}
