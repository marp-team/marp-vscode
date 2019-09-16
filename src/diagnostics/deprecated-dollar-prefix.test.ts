import dedent from 'dedent'
import {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  TextDocument,
  languages,
} from 'vscode'
import * as rule from './deprecated-dollar-prefix'

jest.mock('vscode')

const doc = (text: string): TextDocument =>
  ({
    getText: () => text,
    positionAt: (offset: number) => {
      const lines = text.slice(0, offset).split('\n')
      return new Position(lines.length - 1, lines.pop()!.length)
    },
    uri: '/test/document',
  } as any)

describe('[Diagnostics rule] Deprecated dollar prefix', () => {
  describe('#register', () => {
    const register = (doc: TextDocument): Diagnostic[] => {
      const diagnostics: Diagnostic[] = []
      rule.register(doc, diagnostics)

      return diagnostics
    }

    it('does not add diagnostics when passed pure markdown', () =>
      expect(register(doc('# Hello'))).toHaveLength(0))

    it('does not add diagnostics when passed only marp directive', () =>
      expect(register(doc('---\nmarp: true\n---\n\n# Hello'))).toHaveLength(0))

    it('does not add diagnostics when passed valid directives', () =>
      expect(
        register(doc('---\nmarp: true\ntheme: default\n---'))
      ).toHaveLength(0))

    it('adds diagnostics to warn deprecated directives when passed outdated directives', () => {
      const [$theme] = register(doc('---\nmarp: true\n$theme: default\n---'))

      expect($theme).toBeInstanceOf(Diagnostic)
      expect($theme.code).toBe(rule.code)
      expect($theme.source).toBe('marp-vscode')
      expect($theme.severity).toBe(DiagnosticSeverity.Warning)
      expect($theme.range).toMatchObject({
        start: new Position(2, 0),
        end: new Position(2, 6),
      })

      // Multiple deprecated directives
      const document = doc(dedent`
        ---
        $size: 4:3
        theme: default

        $headingDivider: 2
        $style: |
          section { background: #eee; }

        marp: true
        ---
      `)

      const diagnostics = register(document)
      expect(diagnostics).toHaveLength(3)
      expect(diagnostics.every(d => d instanceof Diagnostic)).toBe(true)
      expect(diagnostics.every(d => d.source === 'marp-vscode')).toBe(true)
      expect(diagnostics.every(d => d.code === rule.code)).toBe(true)

      const [$size, $headingDivider, $style] = diagnostics
      expect($size.range).toMatchObject({
        start: new Position(1, 0),
        end: new Position(1, 5),
      })
      expect($headingDivider.range).toMatchObject({
        start: new Position(4, 0),
        end: new Position(4, 15),
      })
      expect($style.range).toMatchObject({
        start: new Position(5, 0),
        end: new Position(5, 6),
      })
    })

    it('adds diagnostics when passed outdated directives as HTML comment', () => {
      const document = doc(dedent`
        ---
        marp: true
        ---

        <!-- $theme: default -->

        <!---
        class: foobar
        $size: 16:9
        --->

        \`\`\`
        <!-- $theme: gaia -->
        \`\`\`

            <!-- $theme: uncover -->

        # Hello! <!--fit-->

        xxxxx <!-- $headingDivider: 1 --> xxxxx
      `)

      const diagnostics = register(document)
      expect(diagnostics).toHaveLength(3)
      expect(diagnostics.every(d => d instanceof Diagnostic)).toBe(true)
      expect(diagnostics.every(d => d.source === 'marp-vscode')).toBe(true)
      expect(diagnostics.every(d => d.code === rule.code)).toBe(true)

      const [$theme, $size, $headingDivider] = diagnostics
      expect($theme.range).toMatchObject({
        start: new Position(4, 5),
        end: new Position(4, 11),
      })
      expect($size.range).toMatchObject({
        start: new Position(8, 0),
        end: new Position(8, 5),
      })
      expect($headingDivider.range).toMatchObject({
        start: new Position(19, 11),
        end: new Position(19, 26),
      })
    })
  })

  describe('#subscribe', () => {
    it('subscribes registered RemoveDollarPrefix code action provider', () => {
      const subscriptions: any[] = []
      rule.subscribe(subscriptions)

      expect(languages.registerCodeActionsProvider).toBeCalledWith(
        'markdown',
        expect.any(rule.RemoveDollarPrefix),
        {
          providedCodeActionKinds:
            rule.RemoveDollarPrefix.providedCodeActionKinds,
        }
      )
    })
  })
})
