import { Marp } from '@marp-team/marp-core'
import { ExtensionContext, Uri, commands, workspace } from 'vscode'
import * as exportCommand from './commands/export'
import * as newMarpMarkdown from './commands/new-marp-markdown'
import * as openExtensionSettings from './commands/open-extension-settings'
import * as showQuickPick from './commands/show-quick-pick'
import * as toggleMarpFeature from './commands/toggle-marp-feature'
import diagnostics from './diagnostics/'
import languageProvider from './language/'
import { marpCoreOptionForPreview, clearMarpCoreOptionCache } from './option'
import customTheme from './plugins/custom-theme'
import lineNumber from './plugins/line-number'
import outline, { rule as outlineRule } from './plugins/outline'
import themes, { Themes } from './themes'
import { detectMarpFromMarkdown, marpConfiguration } from './utils'
import { showAlertForWebExtension } from './web/alert'

const shouldRefreshConfs = [
  'markdown.marp.breaks',
  'markdown.marp.enableHtml',
  'markdown.marp.mathTypesetting',
  'markdown.marp.outlineExtension',
  'markdown.marp.themes',
  'markdown.preview.breaks',
  'markdown.preview.typographer',
]

const applyRefreshedConfiguration = () => {
  clearMarpCoreOptionCache()
  commands.executeCommand('markdown.preview.refresh')
}

// Workaround for https://github.com/microsoft/vscode/issues/126640
let isWarnedFailurePatch = false
const hackGetScriptsToExecuteMarpScriptFirst = (resourceProvider: any) => {
  // resourceProvider is not passed by VS Code 1.56 and previous versions.
  if (!resourceProvider) return

  try {
    const { getScripts } = resourceProvider._contentProvider.__proto__

    if (!getScripts['marpPatched']) {
      resourceProvider._contentProvider.__proto__.getScripts = function (
        this: any,
        ...args: any[]
      ) {
        const ret: string = getScripts.apply(this, args)
        const scripts = ret.match(/<script[^>]*><\/script>/g) ?? []

        const marpScriptIdx = scripts.findIndex((script) =>
          script.includes('marp-vscode')
        )

        if (marpScriptIdx >= 0) {
          const [marpScript] = scripts.splice(marpScriptIdx, 1)
          scripts.unshift(marpScript.replace('async', ''))
        }

        return scripts.join('\n')
      }

      Object.defineProperty(
        resourceProvider._contentProvider.__proto__.getScripts,
        'marpPatched',
        { value: true }
      )

      console.debug(
        '[Marp for VS Code] Applied the patch for the order of preview scripts.'
      )
    }
  } catch (e) {
    if (!isWarnedFailurePatch) {
      console.warn(
        "Failed to patch for the order of preview scripts. Marp preview still will work but sometimes may fail to apply VS Code's scroll stabilizer."
      )
      console.warn(e)
    }

    isWarnedFailurePatch = true
  }
}

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
            return Themes.resolveBaseDirectoryForTheme(document)
          }
        }
        return undefined
      })()

      const marp = new Marp(marpCoreOptionForPreview(md.options))
        .use(customTheme)
        .use(outline)
        .use(lineNumber)

      // Switch rules
      if (!(marpConfiguration().get<boolean>('outlineExtension') ?? true)) {
        marp.markdown.disable(outlineRule)
      }

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
          const msg = e instanceof Error ? ` (${e.message})` : ''

          console.error(
            `Failed to register custom theme from "${theme.path}".${msg}`
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
    hackGetScriptsToExecuteMarpScriptFirst(env.resourceProvider)

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

export const activate = ({ subscriptions, globalState }: ExtensionContext) => {
  showAlertForWebExtension(globalState)

  diagnostics(subscriptions)
  languageProvider(subscriptions)

  subscriptions.push(
    commands.registerCommand(exportCommand.command, exportCommand.default),
    commands.registerCommand(newMarpMarkdown.command, newMarpMarkdown.default),
    commands.registerCommand(
      openExtensionSettings.command,
      openExtensionSettings.default
    ),
    commands.registerCommand(showQuickPick.command, showQuickPick.default),
    commands.registerCommand(
      toggleMarpFeature.command,
      toggleMarpFeature.default
    ),
    themes,
    workspace.onDidChangeConfiguration((e) => {
      if (shouldRefreshConfs.some((c) => e.affectsConfiguration(c))) {
        applyRefreshedConfiguration()
      }
    }),
    workspace.onDidGrantWorkspaceTrust(applyRefreshedConfiguration)
  )

  return { extendMarkdownIt }
}
