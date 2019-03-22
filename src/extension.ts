import { Marp } from '@marp-team/marp-core'
import { workspace } from 'vscode'

const frontMatterRegex = /^-{3,}\s*([^]*?)^\s*-{3}/m
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const marpConfiguration = () => workspace.getConfiguration('markdown.marp')
const marpVscode = Symbol('marp-vscode')

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
