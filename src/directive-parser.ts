import { EventEmitter } from 'events'
import rehypeParse from 'rehype-parse'
import remarkParse from 'remark-parse'
import TypedEmitter from 'typed-emitter'
import unified from 'unified'
import { visit } from 'unist-util-visit'
import { TextDocument } from 'vscode'
import yaml from 'yaml'
import { Pair, YAMLMap } from 'yaml/types'
import { frontMatterRegex } from './utils'

export const parseHtml = unified().use(rehypeParse).parse
export const parseMd = unified().use(remarkParse).parse
export const parseYaml = (yamlBody: string) =>
  yaml.parseDocument(yamlBody, { schema: 'failsafe' })

export enum DirectiveType {
  Global = 'Global',
  Local = 'Local',
}

export enum DirectiveDefinedIn {
  FrontMatter = 'frontMatter',
  Comment = 'comment',
}

const directiveAlwaysAllowed = [
  DirectiveDefinedIn.FrontMatter,
  DirectiveDefinedIn.Comment,
] as const

export enum DirectiveProvidedBy {
  Marpit = 'marpit',
  MarpCore = 'marp-core',
  MarpCLI = 'marp-cli',
  MarpVSCode = 'marp-vscode',
}

interface DirectiveInfoBase {
  allowed: readonly DirectiveDefinedIn[]
  providedBy: DirectiveProvidedBy
  description: string
  name: string
  type: DirectiveType
}

type GlobalDirectiveInfo = DirectiveInfoBase & {
  scoped?: never
  type: DirectiveType.Global
}

type LocalDirectiveInfo = DirectiveInfoBase & {
  scoped?: boolean
  type: DirectiveType.Local
}

export type DirectiveInfo = GlobalDirectiveInfo | LocalDirectiveInfo

export interface DirectiveEventHandler {
  info?: DirectiveInfo
  item: Pair
  offset: number
}

interface DirectiveParserEvents {
  directive: (event: DirectiveEventHandler) => void
  startParse: (event: { document: TextDocument }) => void
  endParse: (event: { document: TextDocument }) => void
}

export class DirectiveParser extends (EventEmitter as new () => TypedEmitter<DirectiveParserEvents>) {
  static builtinDirectives: readonly DirectiveInfo[] = [
    // Marp for VS Code
    {
      name: 'marp',
      description:
        'Set whether or not enable Marp preview in VS Code extension.',
      allowed: [DirectiveDefinedIn.FrontMatter],
      providedBy: DirectiveProvidedBy.MarpVSCode,
      type: DirectiveType.Global,
    },

    // Marpit global directives
    {
      name: 'theme',
      description: 'Specify a theme name of the slide deck.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Global,
    },
    {
      name: 'style',
      description: 'Specify CSS for tweaking theme.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Global,
    },
    {
      name: 'headingDivider',
      description: 'Specify heading divider option.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Global,
    },

    // Marpit local directives
    {
      name: 'paginate',
      description: 'Show page number on the slide if set `true`.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'header',
      description: 'Specify the content of slide header.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'footer',
      description: 'Specify the content of slide footer.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'class',
      description:
        "Specify HTML's `class` attribute for the slide element <section>.",
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'backgroundColor',
      description: 'Setting `background-color` style of the slide.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'backgroundImage',
      description: 'Setting `background-image` style of the slide.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'backgroundPosition',
      description: 'Setting `background-position` style of the slide.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'backgroundRepeat',
      description: 'Setting `background-repeat` style of the slide.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'backgroundSize',
      description: 'Setting `background-size` style of the slide.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },
    {
      name: 'color',
      description: 'Setting `color` style of the slide.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.Marpit,
      type: DirectiveType.Local,
    },

    // Marp Core extension
    {
      name: 'size',
      description: 'Choose the slide size preset provided by theme.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.MarpCore,
      type: DirectiveType.Global,
    },

    // Marp CLI meta options
    {
      name: 'title',
      description: 'Define title of the slide deck.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.MarpCLI,
      type: DirectiveType.Global,
    },
    {
      name: 'description',
      description: 'Define description of the slide deck.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.MarpCLI,
      type: DirectiveType.Global,
    },
    {
      name: 'url',
      description: 'Define canonical URL to the slide deck.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.MarpCLI,
      type: DirectiveType.Global,
    },
    {
      name: 'image',
      description: 'Define Open Graph image URL.',
      allowed: directiveAlwaysAllowed,
      providedBy: DirectiveProvidedBy.MarpCLI,
      type: DirectiveType.Global,
    },
  ]

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
      const { contents, errors } = parseYaml(text)

      if (errors.length === 0 && contents?.['items']) {
        for (const item of (contents as YAMLMap).items) {
          if (item.type === 'PAIR') {
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

            this.emit('directive', {
              info: directiveInfo ? { ...directiveInfo, scoped } : undefined,
              item,
              offset,
            })
          }
        }
      }
    }

    // Front-matter
    const fmMatched = markdown.match(frontMatterRegex)

    if (fmMatched?.index === 0) {
      const [, open, body, close] = fmMatched
      detectDirectives(body, open.length, DirectiveDefinedIn.FrontMatter)

      index = open.length + body.length + close.length
      markdown = markdown.slice(index)
    }

    // HTML comments
    visit(parseMd(markdown), 'html', (n: any) =>
      visit(parseHtml(n.value), 'comment', (c: any) => {
        const trimmedLeft = c.value.replace(/^-*\s*/, '')

        detectDirectives(
          trimmedLeft.replace(/\s*-*$/, ''),
          index +
            n.position.start.offset +
            c.position.start.offset +
            4 +
            (c.value.length - trimmedLeft.length)
        )
      })
    )

    this.emit('endParse', { document: doc })
  }
}
