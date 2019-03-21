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

  md[marpVscode] = false
  md.parse = (markdown: string, env: any) => {
    // Generate tokens by Marp if enabled
    md[marpVscode] =
      detectMarpFromFrontMatter(markdown) &&
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

export const activate = () => ({ extendMarkdownIt })
