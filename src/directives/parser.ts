import { EventEmitter } from 'node:events'
import type { Root as RehypeRoot } from 'hast'
import rehypeParse from 'rehype-parse'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import type { Root as RemarkRoot } from 'remark-parse/lib'
import TypedEmitter from 'typed-emitter'
import { Processor, unified } from 'unified'
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
  DirectiveType,
  type DirectiveInfo,
} from './definitions'

const parseHtml: Processor<RehypeRoot>['parse'] = (...args) => {
  const parser = unified().use(rehypeParse)
  return parser.parse(...args)
}

const parseMd: Processor<RemarkRoot>['parse'] = (...args) => {
  const parser = unified().use(remarkParse).use(remarkMath)
  return parser.parse(...args)
}

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

export interface ImageEventHandler {
  alt: string
  body: string
  range: Range
  title: string | null
  url: string
}

export interface MathEventHandler {
  body: string
  range: Range
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DirectiveParserEvents = {
  comment: (event: DirectiveSectionEventHandler) => void
  directive: (event: DirectiveEventHandler) => void
  endParse: (event: { document: TextDocument }) => void
  frontMatter: (event: DirectiveSectionEventHandler) => void
  image: (event: ImageEventHandler) => void
  maybeMath: (event: MathEventHandler) => void
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
      definedIn = DirectiveDefinedIn.Comment,
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

    // HTML comments and Markdown syntax
    const parsed = parseMd(markdown)

    visit(parsed, ['html', 'image', 'math', 'inlineMath'], (n: any) => {
      const range = new Range(
        doc.positionAt(index + n.position.start.offset),
        doc.positionAt(index + n.position.end.offset),
      )

      switch (n.type) {
        case 'html':
          visit(parseHtml(n.value), 'comment', (c: any) => {
            const rawBody = n.value.slice(
              c.position.start.offset,
              c.position.end.offset,
            )

            this.emit('comment', { body: rawBody, range })

            // c.value should not use because it has normalized CRLF to LF
            const value = rawBody.slice(4, -3)
            const trimmedLeft = value.replace(/^-*\s*/, '')

            detectDirectives(
              trimmedLeft.replace(/\s*-*$/, ''),
              index +
                n.position.start.offset +
                c.position.start.offset +
                4 +
                (value.length - trimmedLeft.length),
            )
          })
          break
        case 'image':
          this.emit('image', {
            body: markdown.slice(
              n.position.start.offset,
              n.position.end.offset,
            ),
            range,
            url: n.url,
            alt: n.alt,
            title: n.title,
          })
          break
        case 'math':
        case 'inlineMath': {
          // remark-math is not following Pandoc spec so we need extra validation
          // (math syntax detection is still heuristic because remark-math does not care escaped dollar sign)

          const secondChar = markdown[n.position.start.offset + 1]
          const beforeLast = markdown[n.position.end.offset - 2]
          const trailing = markdown[n.position.end.offset]

          const isInline = secondChar !== '$'

          if (isInline) {
            // The opening $ must have a non-space character immediately to its right
            if (/\s/.test(secondChar)) return

            // The closing $ must have a non-space character immediately to its left
            if (/\s/.test(beforeLast)) return

            // The closing $ must not be followed immediately by a digit
            if (beforeLast !== '\\' && /\d/.test(trailing)) return
          }

          this.emit('maybeMath', {
            body: markdown.slice(
              n.position.start.offset,
              n.position.end.offset,
            ),
            range,
          })
        }
      }
    })

    this.emit('endParse', { document: doc })
  }
}
