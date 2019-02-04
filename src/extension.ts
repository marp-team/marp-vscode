import { Marp } from '@marp-team/marp-core'

const frontMatterRegex = /^---\s*([^]*)?(?:-{3}|\.{3})\s*/
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m

function extendMarkdownIt(md: any) {
  const marp: any = new Marp({
    container: { tag: 'div', id: 'marp-vscode' },
    emoji: { twemoji: { ext: "png" } },
  })

  md.use(marp.markdownItPlugins).use(instance => {
    instance.core.ruler.before('normalize', 'marp_vscode_toggle', state => {
      const fmMatch = frontMatterRegex.exec(state.src)
      state.marpit(!!(fmMatch && marpDirectiveRegex.exec(fmMatch[1].trim())))
    })
  })

  marp.markdown = md
  marp.use(instance => {
    instance.core.ruler.push('marp_vscode_style', ({ Token, tokens }) => {
      const css = marp.renderStyle(marp.lastGlobalDirectives.theme)
      const token = new Token('marp_vscode_style', '', 0)

      token.content = css
      tokens.unshift(token)
    })
  })

  md.renderer.rules.marp_vscode_style = (token, i) =>
    `<style id="marp-vscode-style">${token[i].content}</style>`

  return md
}

export const activate = () => ({ extendMarkdownIt })
