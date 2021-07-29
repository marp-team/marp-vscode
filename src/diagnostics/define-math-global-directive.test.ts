import {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
  workspace,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import * as rule from './define-math-global-directive'

jest.mock('vscode')

const marpDoc = (text: string): TextDocument =>
  ({
    getText: () => `---\nmarp: true\n---\n\n${text}`,
    positionAt: function (offset: number) {
      const lines = this.getText().slice(0, offset).split('\n')

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return new Position(lines.length - 1, lines.pop()!.length)
    },
    uri: '/test/document',
  } as any)

const setConfiguration: (conf?: Record<string, unknown>) => void = (
  workspace as any
)._setConfiguration

describe('[Diagnostics rule] Define math global directive', () => {
  const register = (doc: TextDocument): Diagnostic[] => {
    const parser = new DirectiveParser()
    const diagnostics: Diagnostic[] = []

    rule.register(parser, diagnostics)

    parser.parse(doc)
    return diagnostics
  }

  describe('#register', () => {
    it('adds diagnostic when using math syntax without defining math global directive', () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'katex' })

      const diagnostics = register(marpDoc('$a=1+2$'))
      expect(diagnostics).toHaveLength(1)

      const [diagnostic] = diagnostics
      expect(diagnostic).toBeInstanceOf(Diagnostic)
      expect(diagnostic.code).toBe(rule.code)
      expect(diagnostic.source).toBe('marp-vscode')
      expect(diagnostic.severity).toBe(DiagnosticSeverity.Warning)

      expect(diagnostic.range).toStrictEqual(
        new Range(new Position(4, 0), new Position(4, 1))
      )
    })

    it('adds diagnostic only to the first math', () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'katex' })

      const diagnostics = register(marpDoc('$a$ $b$'))
      expect(diagnostics).toHaveLength(1)

      const [diagnostic] = diagnostics
      expect(diagnostic.range).toStrictEqual(
        new Range(new Position(4, 0), new Position(4, 1))
      )
    })

    it("follows Marp's math syntax (based on Pandoc) as much as possible", () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'katex' })

      const m = (md: string) => register(marpDoc(md))
      expect(m('$$1+1 = 2$$')).toHaveLength(1)

      // The spec of remark-math is different from Marp so we have to make an
      // effort covering Marp's test cases to reduce a noisy diagnostic.
      // https://github.com/marp-team/marp-core/blob/main/test/math/math.ts
      expect(m('$1+1 = 2$')).toHaveLength(1)
      expect(m('$$1+1 = 2$$')).toHaveLength(1)
      expect(m('foo$1+1 = 2$bar')).toHaveLength(1)
      expect(m('foo$-1+1 = 0$bar')).toHaveLength(1)
      expect(m('aaa $$ bbb')).toHaveLength(0)
      expect(m('aaa $5.99 bbb')).toHaveLength(0)
      expect(m('foo $1+1\n\n= 2$ bar')).toHaveLength(0)
      expect(m('foo $1 *i* 1$ bar')).toHaveLength(1)
      expect(m('   $$\n   1+1 = 2\n   $$')).toHaveLength(1)
      expect(m('    $$\n    1+1 = 2\n    $$')).toHaveLength(0)
      expect(m('foo $1 + 1\n= 2$ bar')).toHaveLength(1)
      expect(m('$$\n\n  1\n+ 1\n\n= 2\n\n$$')).toHaveLength(1)
      expect(m('$n$-th order')).toHaveLength(1)
      expect(m('$$\n1+1 = 2')).toHaveLength(1)
      expect(m('* $1+1 = 2$\n* $$\n  1+1 = 2\n  $$')).toHaveLength(1)
      expect(m('$$1+1 = 2$$')).toHaveLength(1)
      expect(m('$$[\n[1, 2]\n[3, 4]\n]$$')).toHaveLength(1)
      expect(m('Foo \\$1$ bar\n\\$\\$\n1\n\\$\\$')).toHaveLength(0)
      expect(
        m("Thus, $20,000 and USD$30,000 won't parse as math.")
      ).toHaveLength(0)
      expect(
        m('For some Europeans, it is 2$ for a can of soda, not 1$.')
      ).toHaveLength(0)
      expect(
        m('I will give you $20 today, if you give me more $ tomorrow.')
      ).toHaveLength(0)
      // expect(
      //   m("It's well know that $$1 + 1 = 3$$ for sufficiently large 1.")
      // ).toHaveLength(0)
      expect(m('Money adds: $\\$X + \\$Y = \\$Z$.')).toHaveLength(1)
      expect(
        m(
          'Weird-o: $\\displaystyle{\\begin{pmatrix} \\$ & 1\\\\\\$ \\end{pmatrix}}$.'
        )
      ).toHaveLength(1)
    })

    it('does not add diagnostics when disabled math feature', () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'off' })

      const diagnostics = register(marpDoc('$a=1+2$'))
      expect(diagnostics).toHaveLength(0)
    })
  })
})
