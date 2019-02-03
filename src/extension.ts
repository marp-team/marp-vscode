import { Marp } from '@marp-team/marp-core'

const frontMatterRegex = /^---\s*([^]*)?(?:-{3}|\.{3})\s*/
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const twemojiCDNRegex = /\bhttps?:\/\/twemoji\.maxcdn\.com\/(2\/)?svg\/([0-9a-z-]+)\.svg\b/i

function extendMarkdownIt(md: any) {
  const marp: any = new Marp({
    container: { tag: 'div', id: 'marp-vscode' },
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

  // VSCode cannot render the external SVG resource by security reason.
  const { emoji, marp_unicode_emoji: unicodeEmoji } = md.renderer.rules
  const replaceTwemojiSVG = (base: string) => {
    return base.replace(
      twemojiCDNRegex,
      (_, ver, code) =>
        `https://twemoji.maxcdn.com/${ver || ''}72x72/${code}.png`
    )
  }

  md.renderer.rules.emoji = (...args) => replaceTwemojiSVG(emoji(...args))
  md.renderer.rules.marp_unicode_emoji = (...args) =>
    replaceTwemojiSVG(unicodeEmoji(...args))

  return md
}

export const activate = () => ({ extendMarkdownIt })
