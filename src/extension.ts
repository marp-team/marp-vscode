import { Marp } from '@marp-team/marp-core'
import { workspace } from 'vscode'

const frontMatterRegex = /^---\s*([^]*)?(?:-{3}|\.{3})\s*/
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const marpConfiguration = () => workspace.getConfiguration('markdown.marp')
const marpVscode = Symbol('marp-vscode')

export function extendMarkdownIt(md: any) {
  const { parse, renderer } = md
  const { render } = renderer

  md.parse = (markdown: string, env: any) => {
    // Detect `marp: true` front-matter option
    const fmMatch = frontMatterRegex.exec(markdown)
    const enabled = !!(fmMatch && marpDirectiveRegex.exec(fmMatch[1].trim()))

    // Generate tokens by Marp if enabled
    if (enabled) {
      const zoom =
        workspace.getConfiguration('window').get<number>('zoomLevel') || 0

      md[marpVscode] = new Marp({
        container: { tag: 'div', id: 'marp-vscode', 'data-zoom': 1.2 ** zoom },
        html: marpConfiguration().get<boolean>('enableHtml') || undefined,
      })

      return md[marpVscode].markdown.parse(markdown, env)
    }

    // Fallback to original instance if Marp was not enabled
    md[marpVscode] = false
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

export const activate = () => ({ extendMarkdownIt })
