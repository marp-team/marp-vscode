export default function marpVSCodeOutline(instance) {
  instance.core.ruler.push('marp_vscode_outline', state => {
    if (state.inlineMode) return

    const tokens: any[] = []
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        tokens.push(
          Object.assign(new state.Token('heading_open', '', 1), {
            hidden: true,
            map: token.map || [0, 0],
            markup: '',
          }),
          Object.assign(new state.Token('heading_close', '', -1), {
            hidden: true,
          })
        )
      }
      tokens.push(token)
    }

    state.tokens = tokens
  })
}
