export default function marpVSCodeLineNumber(md) {
  const { marpit_inline_svg_open } = md.renderer.rules

  md.renderer.rules.marpit_inline_svg_open = (tokens, idx, opts, env, self) => {
    const slide = tokens
      .slice(idx + 1)
      .find(t => t.type === 'marpit_slide_open')

    if (slide.map && slide.map.length) {
      tokens[idx].attrJoin('class', 'code-line')
      tokens[idx].attrSet('data-line', slide.map[0])
    }

    const renderer = marpit_inline_svg_open || self.renderToken
    return renderer.call(self, tokens, idx, opts, env, self)
  }
}
