import { Marp } from '@marp-team/marp-core'

const frontMatterRegex = /^---\s*([^]*)?(?:-{3}|\.{3})\s*/
const marpDirectiveRegex = /^marp\s*:\s*true\s*$/m
const marpVscodeEnabled = Symbol()

export function extendMarkdownIt(md: any) {
  const marp: any = new Marp({
    container: { tag: 'div', id: 'marp-vscode' },
    emoji: { twemoji: { ext: 'png' } },
  })

  md.use(marp.markdownItPlugins)
    .use(instance => {
      // Detect `marp: true` front-matter option
      instance.core.ruler.before('normalize', 'marp_vscode_toggle', state => {
        if (state.inlineMode) return

        const fmMatch = frontMatterRegex.exec(state.src)
        const enabled = !!(
          fmMatch && marpDirectiveRegex.exec(fmMatch[1].trim())
        )

        instance[marpVscodeEnabled] = enabled
        state.marpit(enabled)
      })
    })
    .use(instance => {
      let originalEmojiRule

      instance.core.ruler.push('marp_vscode_postprocess', state => {
        if (state.inlineMode) return

        // Override markdown-it-emoji renderer provided by other plugin
        if (
          !originalEmojiRule &&
          Object.prototype.hasOwnProperty.call(instance.renderer.rules, 'emoji')
        ) {
          originalEmojiRule = instance.renderer.rules.emoji
          instance.renderer.rules.emoji = function(...args) {
            if (instance[marpVscodeEnabled]) {
              return instance.renderer.rules.marp_emoji(...args)
            }
            return originalEmojiRule(...args)
          }
        }
      })
    })

  // Render converted CSS together with Markdown
  marp.markdown = md
  marp.use(instance => {
    instance.core.ruler.push(
      'marp_vscode_style',
      ({ Token, tokens, inlineMode }) => {
        if (inlineMode) return

        const css = marp.renderStyle(marp.lastGlobalDirectives.theme)
        const token = new Token('marp_vscode_style', '', 0)

        token.content = css
        tokens.unshift(token)
      }
    )
  })

  md.renderer.rules.marp_vscode_style = (token, i) =>
    `<style id="marp-vscode-style">${token[i].content}</style>`

  // Override default highlighter to fix wrong background color
  const { highlight } = md.options

  md.set({
    highlight: function marpHighlighter(code, lang) {
      if (md[marpVscodeEnabled]) {
        const marpHighlight = marp.highlighter(code, lang)
        if (marpHighlight) return marpHighlight

        // Special support for mermaid plugin
        if (lang && lang.toLowerCase() === 'mermaid') {
          return `<div class="mermaid">${md.utils.escapeHtml(code)}</div>`
        }
        return ''
      }
      return highlight(code, lang)
    },
  })

  return md
}

export const activate = () => ({ extendMarkdownIt })
