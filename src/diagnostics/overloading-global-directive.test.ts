import dedent from 'dedent'
import {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
} from 'vscode'
import { DirectiveParser } from '../directive-parser'
import * as rule from './overloading-global-directive'

jest.mock('vscode')

const doc = (text: string): TextDocument =>
  ({
    getText: () => text,
    positionAt: (offset: number) => {
      const lines = text.slice(0, offset).split('\n')

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return new Position(lines.length - 1, lines.pop()!.length)
    },
    uri: '/test/document',
  } as any)

describe('[Diagnostics rule] Overloading global directive', () => {
  const register = (doc: TextDocument): Diagnostic[] => {
    const parser = new DirectiveParser()
    const diagnostics: Diagnostic[] = []

    rule.register(doc, parser, diagnostics)

    parser.parse(doc)
    return diagnostics
  }

  describe('#register', () => {
    it('adds diagnostics when passed with overloaded global directive', () => {
      const basic = register(
        doc(dedent`
          ---
          theme: default
          size: 4:3
          ---

          <!-- theme: gaia -->
        `)
      )
      expect(basic).toHaveLength(1)

      const [$theme] = basic
      expect($theme).toBeInstanceOf(Diagnostic)
      expect($theme.code).toBe(rule.code)
      expect($theme.source).toBe('marp-vscode')
      expect($theme.severity).toBe(DiagnosticSeverity.Warning)
      expect($theme.range).toStrictEqual(
        new Range(new Position(1, 0), new Position(1, 14))
      )
    })

    it('adds diagnostics when there are multiple overloaded global directives', () => {
      const multiple = register(
        doc(dedent`
          ---
          theme: default
          ---

          <!--
          theme: |
            unknown
          -->

          <!-- theme: gaia -->
        `)
      )
      expect(multiple).toHaveLength(2)

      for (const diagnostic of multiple) {
        expect(diagnostic).toBeInstanceOf(Diagnostic)
      }

      const [$default, $unknown] = multiple
      expect($default.range).toStrictEqual(
        new Range(new Position(1, 0), new Position(1, 14))
      )
      expect($unknown.range).toStrictEqual(
        new Range(new Position(5, 0), new Position(6, 9))
      )
    })

    it('does not add diagnostics when overloaded local directives', () =>
      expect(
        register(
          doc(dedent`
            ---
            paginate: true
            _paginate: false
            ---

            <!--
            paginate: false
            -->
          `)
        )
      ).toHaveLength(0))

    it('does not add diagnostics when overloaded unknown directives', () =>
      expect(
        register(
          doc(dedent`
            ---
            unknown: true
            ---

            <!-- unknown: false -->
          `)
        )
      ).toHaveLength(0))
  })
})
