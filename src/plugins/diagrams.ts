export const rule = 'marp_vscode_diagrams'

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export default function marpVSCodeDiagrams(md: any) {
  const defaultFence =
    md.renderer.rules.fence ||
    function (tokens: any[], idx: number, options: any, _env: any, slf: any) {
      const token = tokens[idx]
      const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
      const langName = info.split(/(\s+)/g)[0]
      const highlighted = options.highlight
        ? options.highlight(token.content, langName, '')
        : escapeHtml(token.content)

      return `<pre${slf.renderAttrs(token)}><code class="${
        info ? `language-${langName}` : ''
      }">${highlighted}</code></pre>\n`
    }

  md.renderer.rules.fence = (
    tokens: any[],
    idx: number,
    options: any,
    env: any,
    slf: any,
  ) => {
    const token = tokens[idx]
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
    const lang = info.split(/(\s+)/g)[0].toLowerCase()

    if (lang === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(token.content)}</div>\n`
    }

    return defaultFence(tokens, idx, options, env, slf)
  }
}
