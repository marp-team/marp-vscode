// Based on the original line-number rendering rule of VS Code.
// https://github.com/microsoft/vscode/blob/5466f27d95c52e8d7c34ed445c682b5d71f049d9/extensions/markdown-language-features/src/markdownEngine.ts#L102-L104

const rules = [
  'paragraph_open',
  'heading_open',
  'image',
  'code_block',
  'fence',
  'blockquote_open',
  'list_item_open',
]

export default function marpVSCodeLineNumber(md) {
  const { marpit_inline_svg_open } = md.renderer.rules

  // Enable line sync by per slides
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

  // Enables line sync per elements
  for (const rule of rules) {
    const original = md.renderer.rules[rule]

    md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
      const token = tokens[idx]

      if (token.map && token.map.length) {
        token.attrJoin('class', 'code-line')
        token.attrSet('data-line', token.map[0])
      }

      const renderer = original || self.renderToken
      return renderer.call(self, tokens, idx, options, env, self)
    }
  }
}
