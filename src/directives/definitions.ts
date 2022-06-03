import dedent from 'dedent'
import { MarkdownString } from 'vscode'

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
  Marpit = 'Marpit framework',
  MarpCore = 'Marp Core',
  MarpCLI = 'Marp CLI',
  MarpVSCode = 'Marp for VS Code',
}

interface DirectiveInfoBase {
  allowed: readonly DirectiveDefinedIn[]
  completable?: boolean
  description: string
  details?: string
  markdownDescription: MarkdownString
  markdownDetails: MarkdownString
  name: string
  providedBy: DirectiveProvidedBy
  type: DirectiveType
}

export type GlobalDirectiveInfo = DirectiveInfoBase & {
  scoped?: never
  type: DirectiveType.Global
}

export type LocalDirectiveInfo = DirectiveInfoBase & {
  scoped?: boolean
  type: DirectiveType.Local
}

export type DirectiveInfo = GlobalDirectiveInfo | LocalDirectiveInfo

export const createDirectiveInfo = (
  info:
    | Omit<GlobalDirectiveInfo, 'markdownDescription' | 'markdownDetails'>
    | Omit<LocalDirectiveInfo, 'markdownDescription' | 'markdownDetails'>
): Readonly<DirectiveInfo> => {
  const directiveText = `\`${info.name}\` [${
    info.type
  } directive](https://marpit.marp.app/directives?id=${info.type.toLowerCase()}-directives)${
    info.scoped ? ' _[Scoped]_' : ''
  }`

  const mdDetails = `_Provided by ${info.providedBy}${
    info.details ? ` ([See more details...](${info.details}))` : ''
  }_`

  return Object.freeze({
    ...info,
    markdownDetails: new MarkdownString(mdDetails),
    markdownDescription: new MarkdownString(
      [directiveText, info.description, mdDetails].join('\n\n---\n\n'),
      true
    ),
  })
}

export const builtinDirectives = [
  // Marp for VS Code
  createDirectiveInfo({
    name: 'marp',
    description: 'Set whether or not enable Marp feature in VS Code.',
    allowed: [DirectiveDefinedIn.FrontMatter],
    providedBy: DirectiveProvidedBy.MarpVSCode,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-vscode#usage',
  }),

  // Marpit global directives
  createDirectiveInfo({
    name: 'theme',
    description: dedent(`
      Set a theme name of the slide deck.

      You can choose from [Marp Core built-in themes](https://github.com/marp-team/marp-core/tree/main/themes) or registered custom themes.
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Global,
    details: 'https://marpit.marp.app/directives?id=theme',
    completable: true,
  }),
  createDirectiveInfo({
    name: 'style',
    description: dedent(`
      Specify CSS for tweaking theme.

      It is exactly same as defining inline style within Markdown. Useful if \`<style>\` would break the view in the other Markdown tools.

      \`\`\`yaml
      style: |
        section {
          background-color: #123;
          color: #def;
        }
      \`\`\`
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Global,
    details: 'https://marpit.marp.app/directives?id=tweak-theme-style',
  }),
  createDirectiveInfo({
    name: 'headingDivider',
    description: dedent(`
      Specify heading divider option.

      You may instruct to divide slide pages at before of headings automatically. It is useful for making slide from existing Markdown document.

      It have to specify heading level from 1 to 6, or array of them. This feature is enabled at headings having the level _higher than or equal to the specified value_ if in a number, and it is enabled at _only specified levels_ if in array.

      \`\`\`yaml
      # Divide pages by headings having level 3 and higher (#, ##, ###)
      headingDivider: 3

      # Divide pages by only headings having level 1 and 3 (#, ###)
      headingDivider: [1, 3]
      \`\`\`
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Global,
    details: 'https://marpit.marp.app/directives?id=heading-divider',
  }),

  // Marpit local directives
  createDirectiveInfo({
    name: 'paginate',
    description: 'Show page number on the slide if set `true`.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=pagination',
    completable: true,
  }),
  createDirectiveInfo({
    name: 'header',
    description: dedent(`
      Set the content of slide header.

      The content of header can use basic Markdown formatting. To prevent the broken parsing by YAML special characters, recommend to wrap by quotes \`"\` or \`'\` when used Markdown syntax:

      \`\`\`yaml
      header: "**Header content**"
      \`\`\`

      To clear the header content in the middle of slides, set an empty string:

      \`\`\`yaml
      header: ""
      \`\`\`
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=header-and-footer',
  }),
  createDirectiveInfo({
    name: 'footer',
    description: dedent(`
      Set the content of slide footer.

      The content of footer can use basic Markdown formatting. To prevent the broken parsing by YAML special characters, recommend to wrap by quotes \`"\` or \`'\` when used Markdown syntax:

      \`\`\`yaml
      footer: "**Footer content**"
      \`\`\`

      To clear the footer content in the middle of slides, set an empty string:

      \`\`\`yaml
      footer: ""
      \`\`\`
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=header-and-footer',
  }),
  createDirectiveInfo({
    name: 'class',
    description:
      'Set [HTML `class` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class) for the slide element `<section>`.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=class',
  }),
  createDirectiveInfo({
    name: 'backgroundColor',
    description:
      'Set [`background-color` style](https://developer.mozilla.org/en-US/docs/Web/CSS/background-color) of the slide.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=backgrounds',
  }),
  createDirectiveInfo({
    name: 'backgroundImage',
    description:
      'Set [`background-image` style](https://developer.mozilla.org/en-US/docs/Web/CSS/background-image) of the slide.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=backgrounds',
  }),
  createDirectiveInfo({
    name: 'backgroundPosition',
    description:
      'Set [`background-position` style](https://developer.mozilla.org/en-US/docs/Web/CSS/background-position) of the slide.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=backgrounds',
  }),
  createDirectiveInfo({
    name: 'backgroundRepeat',
    description:
      'Set [`background-repeat` style](https://developer.mozilla.org/en-US/docs/Web/CSS/background-repeat) of the slide.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=backgrounds',
  }),
  createDirectiveInfo({
    name: 'backgroundSize',
    description:
      'Set [`background-size` style](https://developer.mozilla.org/en-US/docs/Web/CSS/background-size) of the slide.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=backgrounds',
  }),
  createDirectiveInfo({
    name: 'color',
    description:
      'Set [`color` style](https://developer.mozilla.org/en-US/docs/Web/CSS/color) of the slide.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.Marpit,
    type: DirectiveType.Local,
    details: 'https://marpit.marp.app/directives?id=backgrounds',
  }),

  // Marp Core extension
  createDirectiveInfo({
    name: 'math',
    description: dedent(`
      Choose a library to render math typesetting in the current Markdown.

      - \`mathjax\`: Use [MathJax](https://www.mathjax.org/).
      - \`katex\`: Use [KaTeX](https://katex.org/).

      Marp may change the default library of the ecosystem in the future. To prevent breaking existing slides, recommend to declare used library whenever to use math typesetting.
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCore,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-core#math-global-directive',
    completable: true,
  }),
  createDirectiveInfo({
    name: 'size',
    description: dedent(`
      Choose the slide size preset provided by theme.

      Accepted presets are depending on using theme. In the case of Marp Core built-in theme, you can choose from \`16:9\` (1280x720) or \`4:3\` (960x720).
    `),
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCore,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-core#size-global-directive',
    completable: true,
  }),

  // Marp CLI metadata options
  createDirectiveInfo({
    name: 'title',
    description: 'Set title of the slide deck.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCLI,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-cli#metadata',
  }),
  createDirectiveInfo({
    name: 'description',
    description: 'Set description of the slide deck.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCLI,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-cli#metadata',
  }),
  createDirectiveInfo({
    name: 'author',
    description: 'Set author of the slide deck.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCLI,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-cli#metadata',
  }),
  createDirectiveInfo({
    name: 'keywords',
    description:
      'Set keywords for the slide deck. It accepts a string consisted by comma-separated keywords, or YAML array of keywords.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCLI,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-cli#metadata',
  }),
  createDirectiveInfo({
    name: 'url',
    description: 'Set canonical URL for the slide deck.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCLI,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-cli#metadata',
  }),
  createDirectiveInfo({
    name: 'image',
    description: 'Set Open Graph image URL.',
    allowed: directiveAlwaysAllowed,
    providedBy: DirectiveProvidedBy.MarpCLI,
    type: DirectiveType.Global,
    details: 'https://github.com/marp-team/marp-cli#metadata',
  }),
] as const
