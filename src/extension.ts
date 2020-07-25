import path from 'path'
import { Marp } from '@marp-team/marp-core'
import { ExtensionContext, Uri, commands, workspace } from 'vscode'
import * as exportCommand from './commands/export'
import * as openExtensionSettings from './commands/open-extension-settings'
import * as showQuickPick from './commands/show-quick-pick'
import * as toggleMarpPreview from './commands/toggle-marp-preview'
import customTheme from './plugins/custom-theme'
import lineNumber from './plugins/line-number'
import outline from './plugins/outline'
import diagnostics from './diagnostics/'
import { marpCoreOptionForPreview, clearMarpCoreOptionCache } from './option'
import themes from './themes'
import { detectMarpFromMarkdown } from './utils'

const shouldRefreshConfs = [
  'markdown.marp.breaks',
  'markdown.marp.enableHtml',
  'markdown.marp.mathTypesetting',
  'markdown.marp.themes',
  'markdown.preview.breaks',
]

export const marpVscode = Symbol('marp-vscode')

export function extendMarkdownIt(md: any) {
  const { parse, renderer } = md
  const { render } = renderer

  md.parse = (markdown: string, env: any) => {
    // Generate tokens by Marp if enabled
    if (detectMarpFromMarkdown(markdown)) {
      // A messy resolution by finding matched document to resolve workspace or directory of Markdown
      // https://github.com/microsoft/vscode/issues/84846
      const baseFolder: Uri | undefined = (() => {
        for (const document of workspace.textDocuments) {
          if (
            document.languageId === 'markdown' &&
            document.getText().replace(/\u2028|\u2029/g, '') === markdown
          ) {
            const workspaceFolder = workspace.getWorkspaceFolder(document.uri)
            if (workspaceFolder) return workspaceFolder.uri

            return document.uri.with({ path: path.dirname(document.fileName) })
          }
        }
        return undefined
      })()

      const marp = new Marp(marpCoreOptionForPreview(md.options))
        .use(customTheme)
        .use(outline)
        .use(lineNumber)

      // Load custom themes
      Promise.all(
        themes.loadStyles(baseFolder).map((p) =>
          p.then(
            (theme) => theme.registered,
            (e) => console.error(e)
          )
        )
      ).then((registered) => {
        if (registered.some((f) => f === true)) {
          commands.executeCommand('markdown.preview.refresh')
        }
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
  diagnostics(subscriptions)

  subscriptions.push(
    commands.registerCommand(exportCommand.command, exportCommand.default),
    commands.registerCommand(
      openExtensionSettings.command,
      openExtensionSettings.default
    ),
    commands.registerCommand(showQuickPick.command, showQuickPick.default),
    commands.registerCommand(
      toggleMarpPreview.command,
      toggleMarpPreview.default
    ),
    themes,
    workspace.onDidChangeConfiguration((e) => {
      if (shouldRefreshConfs.some((c) => e.affectsConfiguration(c))) {
        clearMarpCoreOptionCache()
        commands.executeCommand('markdown.preview.refresh')
      }
    })
  )

  return { extendMarkdownIt }
}
