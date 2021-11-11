// Based on the original line-number rendering rule of VS Code.
// https://github.com/microsoft/vscode/blob/4297ff8195cfabb0f96aefd122a6e88cb6a080bb/extensions/markdown-language-features/src/markdownEngine.ts#L18-L40

export default function marpVSCodeLineNumber(md) {
  const { marpit_slide_containers_open } = md.renderer.rules

  // Enable line sync by per slides
  md.renderer.rules.marpit_slide_containers_open = (tks, i, opts, env, slf) => {
    const slide = tks.slice(i + 1).find((t) => t.type === 'marpit_slide_open')

    if (slide?.map?.length) {
      tks[i].attrJoin('class', 'code-line')
      tks[i].attrSet('data-line', slide.map[0])
    }

    const renderer = marpit_slide_containers_open || slf.renderToken
    return renderer.call(slf, tks, i, opts, env, slf)
  }

  // Enables line sync per elements
  md.core.ruler.push('marp_vscode_source_map_attr', (state) => {
    for (const token of state.tokens) {
      if (token.map?.length && token.type !== 'inline') {
        token.attrJoin('class', 'code-line')
        token.attrSet('data-line', token.map[0])
      }
    }
  })
}
