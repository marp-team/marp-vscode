import dedent from 'dedent'
import {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
  Uri,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import { Themes } from '../themes'
import * as rule from './unknown-theme'

jest.mock('vscode')

const doc = (text: string): TextDocument =>
  ({
    getText: () => text,
    positionAt: (offset: number) => {
      const lines = text.slice(0, offset).split('\n')

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return new Position(lines.length - 1, lines.pop()!.length)
    },
    uri: Uri.parse('/test/document'),
    fileName: '/test/document',
  }) as any

describe('[Diagnostics rule] Unknown theme', () => {
  const register = (doc: TextDocument): Diagnostic[] => {
    const parser = new DirectiveParser()
    const diagnostics: Diagnostic[] = []

    rule.register(doc, parser, diagnostics)

    parser.parse(doc)
    return diagnostics
  }

  describe('#register', () => {
    it('adds diagnostics when passed theme directive with not recognized theme name', () => {
      const diagnostics = register(
        doc(dedent`
          ---
          marp: true
          theme: unknown
          test: test
          ---
        `),
      )
      expect(diagnostics).toHaveLength(1)

      const [$theme] = diagnostics
      expect($theme).toBeInstanceOf(Diagnostic)
      expect($theme.code).toBe(rule.code)
      expect($theme.source).toBe('marp-vscode')
      expect($theme.severity).toBe(DiagnosticSeverity.Warning)
      expect($theme.range).toStrictEqual(
        new Range(new Position(2, 7), new Position(2, 14)),
      )
    })

    it('does not add diagnostics when theme directive is not defined', () =>
      expect(register(doc(''))).toHaveLength(0))

    it('does not add diagnostics when the specified theme is recognized', () => {
      expect(register(doc('<!-- theme: default -->'))).toHaveLength(0)
      expect(register(doc('<!-- theme: gaia -->'))).toHaveLength(0)
      expect(register(doc('<!-- theme: uncover -->'))).toHaveLength(0)
    })

    it('does not add diagnostics when the definition of theme directive is incompleted', () => {
      expect(register(doc('<!-- theme:-->'))).toHaveLength(0)
      expect(register(doc('<!-- theme: -->'))).toHaveLength(0)
      expect(register(doc('<!-- theme:  -->'))).toHaveLength(0)
      expect(register(doc('<!-- theme:\t-->'))).toHaveLength(0)
    })

    it('adds diagnostics if set empty string explicitly', () => {
      expect(register(doc('<!-- theme: "" -->'))).toHaveLength(1)
      expect(register(doc("<!-- theme: '' -->"))).toHaveLength(1)
    })

    describe('when registered custom theme', () => {
      let getRegisteredStylesMock: jest.SpyInstance

      beforeEach(() => {
        getRegisteredStylesMock = jest
          .spyOn(Themes.prototype, 'getRegisteredStyles')
          .mockReturnValue([{ css: '/* @theme custom-theme */' } as any])
      })

      afterEach(() => getRegisteredStylesMock?.mockRestore())

      it('does not add diagnostics when specified the name of custom theme', () => {
        expect(register(doc('<!-- theme: custom-theme -->'))).toHaveLength(0)
      })
    })
  })
})
