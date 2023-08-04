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
import * as rule from './unknown-size'

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

describe('[Diagnostics rule] Unknown size', () => {
  const register = (doc: TextDocument): Diagnostic[] => {
    const parser = new DirectiveParser()
    const diagnostics: Diagnostic[] = []

    rule.register(doc, parser, diagnostics)

    parser.parse(doc)
    return diagnostics
  }

  describe('#register', () => {
    it('adds diagnostics when passed size directive with not defined size preset', () => {
      const diagnostics = register(
        doc(dedent`
          ---
          marp: true
          size: unknown
          test: test
          ---
        `),
      )
      expect(diagnostics).toHaveLength(1)

      const [$size] = diagnostics
      expect($size).toBeInstanceOf(Diagnostic)
      expect($size.code).toBe(rule.code)
      expect($size.source).toBe('marp-vscode')
      expect($size.severity).toBe(DiagnosticSeverity.Warning)
      expect($size.range).toStrictEqual(
        new Range(new Position(2, 0), new Position(2, 13)),
      )
    })

    it('does not add diagnostics when size directive is not defined', () =>
      expect(register(doc(''))).toHaveLength(0))

    it('does not add diagnostics when the specified size is defined in used theme', () => {
      expect(register(doc('<!-- size: 16:9 -->'))).toHaveLength(0)
      expect(register(doc('<!-- size: 4:3 -->'))).toHaveLength(0)
    })

    it('does not add diagnostics when the definition of size directive is incompleted', () => {
      expect(register(doc('<!-- size:-->'))).toHaveLength(0)
      expect(register(doc('<!-- size: -->'))).toHaveLength(0)
      expect(register(doc('<!-- size:  -->'))).toHaveLength(0)
      expect(register(doc('<!-- size:\t-->'))).toHaveLength(0)
    })

    it('adds diagnostics if set empty string explicitly', () => {
      expect(register(doc('<!-- size: "" -->'))).toHaveLength(1)
      expect(register(doc("<!-- size: '' -->"))).toHaveLength(1)
    })

    describe('when registered custom theme', () => {
      let getRegisteredStylesMock: jest.SpyInstance

      beforeEach(() => {
        getRegisteredStylesMock = jest
          .spyOn(Themes.prototype, 'getRegisteredStyles')
          .mockReturnValue([
            {
              css: dedent`
              @import "default";

              /* @theme custom-theme */
              /* @size a4 210mm 297mm */
              /* @size 4:3 false */
            `,
            } as any,
          ])
      })

      afterEach(() => getRegisteredStylesMock?.mockRestore())

      it('does not add diagnostics when specified the custom size preset', () => {
        expect(
          register(doc('<!--\ntheme: custom-theme\nsize: a4\n-->')),
        ).toHaveLength(0)
        expect(
          register(doc('<!--\ntheme: custom-theme\nsize: 16:9\n-->')),
        ).toHaveLength(0)
      })

      it('adds diagnostics when not used the correct theme', () => {
        expect(register(doc('<!-- size: a4 -->'))).toHaveLength(1)
      })
    })
  })
})
