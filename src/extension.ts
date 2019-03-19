import { Marp } from '@marp-team/marp-core'
import { ExtensionContext, workspace } from 'vscode'

const frontMatterRegex = /^---\s*([^]*)?(?:-{3}|\.{3})\s*/
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const marpConfiguration = () => workspace.getConfiguration('markdown.marp')
const marpVscode = Symbol('marp-vscode')

export function extendMarkdownIt(md: any) {
  const { parse, renderer } = md
  const { render } = renderer

  md[marpVscode] = false
  md.parse = (markdown: string, env: any) => {
    // Detect `marp: true` front-matter option
    const fmMatch = frontMatterRegex.exec(markdown)
    const enabled = !!(fmMatch && marpDirectiveRegex.exec(fmMatch[1].trim()))

    // Generate tokens by Marp if enabled
    md[marpVscode] =
      enabled &&
      new Marp({
        container: { tag: 'div', id: 'marp-vscode' },
        html: marpConfiguration().get<boolean>('enableHtml') || undefined,
      })

    if (md[marpVscode]) return md[marpVscode].markdown.parse(markdown, env)

    // Fallback to original instance if Marp was not enabled
    return parse.call(md, markdown, env)
  }

  renderer.render = (tokens: any[], options: any, env: any) => {
    const marp = md[marpVscode]

    if (marp) {
      const style = marp.renderStyle(marp.lastGlobalDirectives.theme)
      const html = marp.markdown.renderer.render(tokens, options, env)

      return `<style id="marp-vscode-style">${style}</style>${html}`
    }

    return render.call(renderer, tokens, options, env)
  }

  return md
}

export const activate = ({ subscriptions }: ExtensionContext) => {
  // TODO: Re-render preview when opening Marp preview
  // subscriptions.push(workspace.onDidChangeConfiguration(() => {}))

  return { extendMarkdownIt }
}
