import { Marp } from '@marp-team/marp-core'
import { ExtensionContext, Uri, commands, workspace } from 'vscode'
import exportCommand from './commands/export' // tslint:disable-line: import-name
import showQuickPick from './commands/show-quick-pick'
import lineNumber from './plugins/line-number'
import outline from './plugins/outline'
import { marpCoreOptionForPreview, clearMarpCoreOptionCache } from './option'
import themes from './themes'

const frontMatterRegex = /^-{3,}\s*([^]*?)^\s*-{3}/m
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const marpVscode = Symbol('marp-vscode')
const shouldRefreshConfs = [
  'markdown.marp.breaks',
  'markdown.marp.enableHtml',
  'markdown.marp.themes',
  'markdown.preview.breaks',
  'window.zoomLevel', // for WebKit polyfill
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
      const mdFolder = Uri.parse(md.normalizeLink('.')).with({ scheme: 'file' })
      const workspaceFolder = workspace.getWorkspaceFolder(mdFolder)
      const baseFolder = workspaceFolder ? workspaceFolder.uri : mdFolder

      const marp = new Marp(marpCoreOptionForPreview(md.options))
        .use(outline)
        .use(lineNumber)

      const originalThemes = [...marp.themeSet.themes()].map(t => t.name)
      const { addTheme } = marp.themeSet

      marp.themeSet.addTheme = theme => {
        if (originalThemes.includes(theme.name)) {
          throw new Error(
            `Custom theme cannot override "${theme.name}" built-in theme.`
          )
        } else {
          return addTheme.call(marp.themeSet, theme)
        }
      }

      // Load custom themes
      let shouldRefresh = false

      themes
        .loadStyles(baseFolder)
        .then(promises =>
          Promise.all(
            promises.map(promise =>
              promise
                .then(theme => {
                  if (theme.registered) shouldRefresh = true
                })
                .catch(e => console.error(e))
            )
          )
        )
        .then(() => {
          if (shouldRefresh) commands.executeCommand('markdown.preview.refresh')
        })

      for (const theme of themes.getRegisteredStyles(baseFolder)) {
        try {
          marp.themeSet.add(theme.css)
        } catch (e) {
          console.error(
            `Failed to register custom theme from "${theme.path}". (${e.message})`
          )
        }
      }

      // Use image stabilizer and link normalizer from VS Code
      marp.markdown.renderer.rules.image = md.renderer.rules.image
      marp.markdown.normalizeLink = md.normalizeLink

      // validateLink prefers Marp's default. If overridden by VS Code's it,
      // does not return compatible result with the other Marp tools.
      // marp.markdown.validateLink = md.validateLink

      md[marpVscode] = marp
      return marp.markdown.parse(markdown, env)
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
    commands.registerCommand('markdown.marp.export', exportCommand),
    commands.registerCommand('markdown.marp.showQuickPick', showQuickPick),
    themes,
    workspace.onDidChangeConfiguration(e => {
      if (shouldRefreshConfs.some(c => e.affectsConfiguration(c))) {
        clearMarpCoreOptionCache()
        commands.executeCommand('markdown.preview.refresh')
      }
    })
  )

  return { extendMarkdownIt }
}
