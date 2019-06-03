import { Marp } from '@marp-team/marp-core'
import { ExtensionContext, commands, workspace } from 'vscode'
import exportCommand from './commands/export' // tslint:disable-line: import-name
import showQuickPick from './commands/show-quick-pick'
import lineNumber from './plugins/line-number'
import outline from './plugins/outline'
import { marpCoreOptionForPreview, clearMarpCoreOptionCache } from './option'

const frontMatterRegex = /^-{3,}\s*([^]*?)^\s*-{3}/m
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
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

export function extendMarkdownIt(md: any) {
  const { parse, renderer } = md
  const { render } = renderer

  md.parse = (markdown: string, env: any) => {
    // Generate tokens by Marp if enabled
    if (detectMarpFromFrontMatter(markdown)) {
      md[marpVscode] = new Marp(marpCoreOptionForPreview(md.options))
        .use(outline)
        .use(lineNumber)

      const marpMarkdown = md[marpVscode].markdown

      // Use image stabilizer and link normalizer from VS Code
      marpMarkdown.normalizeLink = md.normalizeLink
      marpMarkdown.renderer.rules.image = (tokens, idx, ...args) => {
        const token = tokens[idx]
        const originalSrc = token.attrGet('src')

        // Marpit v1.1.0 stores src attr as String object but VS Code does not
        // allow, so we have to convert attribute to string literal.
        if (originalSrc && typeof originalSrc !== 'string') {
          token.attrSet('src', originalSrc.toString())
        }

        return md.renderer.rules.image(tokens, idx, ...args)
      }

      // validateLink prefers Marp's default. If overridden by VS Code's it,
      // does not return compatible result with the other Marp tools.
      // marpMarkdown.validateLink = md.validateLink

      return marpMarkdown.parse(markdown, env)
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
    commands.registerCommand('markdown.marp.export', exportCommand)
  )

  subscriptions.push(
    commands.registerCommand('markdown.marp.showQuickPick', showQuickPick)
  )

  subscriptions.push(
    workspace.onDidChangeConfiguration(e => {
      if (shouldRefreshConfs.some(c => e.affectsConfiguration(c))) {
        clearMarpCoreOptionCache()
        commands.executeCommand('markdown.preview.refresh')
      }
    })
  )

  return { extendMarkdownIt }
}
