export const rule = 'marp_vscode_content_section'

export const dataStartLine = 'data-marp-vscode-content-start-line'
export const dataEndLine = 'data-marp-vscode-content-end-line'

export default function marpVSCodeContentSection(md) {
  md.core.ruler.push(rule, (state) => {
    if (state.inlineMode) return

    let lastSlideToken: any = null
    let currentLine = 0
    let maxLine = 0

    for (const token of state.tokens) {
      if (token.map) {
        currentLine = token.map[0]
        maxLine = Math.max(maxLine, ...token.map)
      }

      if (token.type === 'marpit_slide_open') {
        if (lastSlideToken) {
          if (lastSlideToken.map)
            lastSlideToken.attrSet(dataStartLine, lastSlideToken.map[0])

          lastSlideToken.attrSet(dataEndLine, currentLine - 1)
        }
        lastSlideToken = token
      }
    }

    if (lastSlideToken) {
      if (lastSlideToken.map)
        lastSlideToken.attrSet(dataStartLine, lastSlideToken.map[0])

      lastSlideToken.attrSet(dataEndLine, maxLine)
    }
  })
}
