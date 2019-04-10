import { Marp, MarpOptions } from '@marp-team/marp-core'
import { ExtensionContext, commands, workspace } from 'vscode'

let cachedMarpOption: MarpOptions | undefined

const frontMatterRegex = /^-{3,}\s*([^]*?)^\s*-{3}/m
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const marpConfiguration = () => workspace.getConfiguration('markdown.marp')
const marpVscode = Symbol('marp-vscode')
const shouldRefreshConfs = [
  'markdown.marp.breaks',
  'markdown.marp.enableHtml',
  'markdown.preview.breaks',
  'window.zoomLevel',
]

const detectMarpFromFrontMatter = (markdown: string): boolean => {
  const m = markdown.match(frontMatterRegex)
  return !!(m && m.index === 0 && marpDirectiveRegex.exec(m[0].trim()))
}

const marpOption = (baseOpts): MarpOptions => {
  if (!cachedMarpOption) {
    const breaks: boolean = (() => {
      switch (marpConfiguration().get<string>('breaks')) {
        case 'off':
          return false
        case 'inherit':
          return baseOpts.breaks
        default:
          return true
      }
    })()

    const zoom =
      workspace.getConfiguration('window').get<number>('zoomLevel') || 0

    cachedMarpOption = {
      container: { tag: 'div', id: 'marp-vscode', 'data-zoom': 1.2 ** zoom },
      html: marpConfiguration().get<boolean>('enableHtml') || undefined,
      markdown: { breaks },
    }
  }
  return cachedMarpOption
}

export function extendMarkdownIt(md: any) {
  const { parse, renderer } = md
  const { render } = renderer

  md.parse = (markdown: string, env: any) => {
    // Generate tokens by Marp if enabled
    if (detectMarpFromFrontMatter(markdown)) {
      md[marpVscode] = new Marp(marpOption(md.options))
      return md[marpVscode].markdown.parse(markdown, env)
    }

    // Fallback to original instance if Marp was not enabled
    md[marpVscode] = false
    return parse.call(md, markdown, env)
  }

  renderer.render = (tokens: any[], options: any, env: any) => {
    const marp = md[marpVscode]

    if (marp) {
      const { markdown } = marp
      const style = marp.renderStyle(marp.lastGlobalDirectives.theme)
      const html = markdown.renderer.render(tokens, markdown.options, env)

      return `<style id="marp-vscode-style">${style}</style>${html}`
    }

    return render.call(renderer, tokens, options, env)
  }

  return md
}

export const activate = ({ subscriptions }: ExtensionContext) => {
  subscriptions.push(
    workspace.onDidChangeConfiguration(e => {
      if (shouldRefreshConfs.some(c => e.affectsConfiguration(c))) {
        cachedMarpOption = undefined
        commands.executeCommand('markdown.preview.refresh')
      }
    })
  )

  return { extendMarkdownIt }
}
