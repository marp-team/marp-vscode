import dedent from 'dedent'
import {
  CancellationToken,
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  languages,
  Position,
  Range,
  TextDocument,
  WorkspaceEdit,
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
  const register = (doc: TextDocument): Diagnostic[] => {
    const diagnostics: Diagnostic[] = []
    rule.register(doc, diagnostics)

    return diagnostics
  }

  describe('#register', () => {
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
      expect($theme.range).toStrictEqual(
        new Range(new Position(2, 0), new Position(2, 6))
      )

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
      expect($size.range).toStrictEqual(
        new Range(new Position(1, 0), new Position(1, 5))
      )
      expect($headingDivider.range).toStrictEqual(
        new Range(new Position(4, 0), new Position(4, 15))
      )
      expect($style.range).toStrictEqual(
        new Range(new Position(5, 0), new Position(5, 6))
      )
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

          <!-- $style: "" -->

        # Hello! <!--fit-->

        xxxxx <!-- $headingDivider: 1 --> xxxxx
      `)

      const diagnostics = register(document)
      expect(diagnostics).toHaveLength(4)
      expect(diagnostics.every(d => d instanceof Diagnostic)).toBe(true)
      expect(diagnostics.every(d => d.source === 'marp-vscode')).toBe(true)
      expect(diagnostics.every(d => d.code === rule.code)).toBe(true)

      const [$theme, $size, $style, $headingDivider] = diagnostics
      expect($theme.range).toStrictEqual(
        new Range(new Position(4, 5), new Position(4, 11))
      )
      expect($size.range).toStrictEqual(
        new Range(new Position(8, 0), new Position(8, 5))
      )
      expect($style.range).toStrictEqual(
        new Range(new Position(17, 7), new Position(17, 13))
      )
      expect($headingDivider.range).toStrictEqual(
        new Range(new Position(21, 11), new Position(21, 26))
      )
    })
  })

  describe('#subscribe', () => {
    it('subscribes registered RemoveDollarPrefix code action provider', () => {
      const subscriptions: any[] = []
      rule.subscribe(subscriptions)

      expect(languages.registerCodeActionsProvider).toBeCalledWith(
        'markdown',
        expect.any(rule.RemoveDollarPrefix),
        { providedCodeActionKinds: [CodeActionKind.QuickFix] }
      )
    })
  })

  describe('RemoveDollarPrefix code action', () => {
    describe('#provideCodeActions', () => {
      const dummyRange = new Range(new Position(0, 0), new Position(0, 0))
      const dummyToken = {} as CancellationToken

      it('returns created code actions for corresponding diagnostics', () => {
        const document = doc('---\nmarp: true\n$theme: default\n---')
        const diagnostics = register(document)
        const codeActions = new rule.RemoveDollarPrefix().provideCodeActions(
          document,
          dummyRange,
          { diagnostics },
          dummyToken
        )

        expect(codeActions).toHaveLength(1)
        expect(codeActions![0]).toBeInstanceOf(CodeAction)

        // Quick fix action
        const action: CodeAction = codeActions![0]
        expect(action.kind).toBe(CodeActionKind.QuickFix)
        expect(action.diagnostics).toStrictEqual(diagnostics)
        expect(action.edit).toBeInstanceOf(WorkspaceEdit)

        // Edit
        const edit: WorkspaceEdit = action.edit!
        expect(edit.delete).toBeCalledTimes(1)
        expect(edit.delete).toBeCalledWith(
          document.uri,
          new Range(new Position(2, 0), new Position(2, 1)) // "$"
        )
      })

      it('does not create code actions when dorresponding diagnostics have not passed', () => {
        const document = doc('---\nmarp: true\n---')
        const diagnostics = register(document)
        const codeActions = new rule.RemoveDollarPrefix().provideCodeActions(
          document,
          dummyRange,
          { diagnostics },
          dummyToken
        )

        expect(codeActions).toHaveLength(0)
      })
    })
  })
})
