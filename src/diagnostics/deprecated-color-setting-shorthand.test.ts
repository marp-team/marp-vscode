import {
  CancellationToken,
  CodeAction,
  CodeActionTriggerKind,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  languages,
  Position,
  Range,
  TextDocument,
  WorkspaceEdit,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import * as rule from './deprecated-color-setting-shorthand'

jest.mock('vscode')

const doc = (text: string): TextDocument =>
  ({
    getText: () => text,
    positionAt: (offset: number) => {
      const lines = text.slice(0, offset).split('\n')

      return new Position(lines.length - 1, lines.pop()!.length)
    },
    uri: '/test/document',
  }) as any

describe('[Diagnostics rule] Deprecated color setting shorthand', () => {
  const register = (doc: TextDocument): Diagnostic[] => {
    const parser = new DirectiveParser()
    const diagnostics: Diagnostic[] = []

    rule.register(parser, diagnostics)

    parser.parse(doc)
    return diagnostics
  }

  describe('#register', () => {
    it('does not add diagnostics, to the image syntax not for setting colors', () => {
      expect(register(doc('![](/image.jpg)'))).toHaveLength(0)
      expect(register(doc('![unknown](blue)'))).toHaveLength(0)
    })

    it('adds diagnostics to warn deprecated directives when used shorthand syntax for setting color', () => {
      // Text
      const [$text] = register(doc('![](red)'))

      expect($text).toBeInstanceOf(Diagnostic)
      expect($text.code).toBe(rule.code)
      expect($text.source).toBe('marp-vscode')
      expect($text.severity).toBe(DiagnosticSeverity.Warning)
      expect($text.range).toStrictEqual(
        new Range(new Position(0, 0), new Position(0, 8)),
      )

      // Background
      const [$bg] = register(doc('![bg](currentColor)'))

      expect($bg).toBeInstanceOf(Diagnostic)
      expect($bg.code).toBe(rule.code)
      expect($bg.source).toBe('marp-vscode')
      expect($bg.severity).toBe(DiagnosticSeverity.Warning)
      expect($bg.range).toStrictEqual(
        new Range(new Position(0, 0), new Position(0, 19)),
      )

      // Multiple syntaxes in inline
      const [$inlineText, $inlineBg] = register(
        doc('![](#abc)![bg](rgb(0,0,0))'),
      )

      expect($inlineText).toBeInstanceOf(Diagnostic)
      expect($inlineText.code).toBe(rule.code)
      expect($inlineText.range).toStrictEqual(
        new Range(new Position(0, 0), new Position(0, 9)),
      )
      expect($inlineBg).toBeInstanceOf(Diagnostic)
      expect($inlineBg.code).toBe(rule.code)
      expect($inlineBg.range).toStrictEqual(
        new Range(new Position(0, 9), new Position(0, 26)),
      )
    })
  })

  describe('#subscribe', () => {
    it('subscribes registered DeprecatedColorSettingShorthand code action provider', () => {
      const subscriptions: any[] = []
      rule.subscribe(subscriptions)

      expect(languages.registerCodeActionsProvider).toHaveBeenCalledWith(
        'markdown',
        expect.any(rule.DeprecatedColorSettingShorthand),
        {
          providedCodeActionKinds: [CodeActionKind.QuickFix],
        },
      )
    })
  })

  describe('DeprecatedColorSettingShorthand code action', () => {
    describe('#provideCodeActions', () => {
      const dummyRange = new Range(new Position(0, 0), new Position(0, 0))
      const dummyToken = {} as CancellationToken

      it('returns created code actions for corresponding diagnostics', () => {
        const document = doc('![](#012abc)\n![bg](rgba(1,2,3,0.5))')
        const diagnostics = register(document)
        const codeActions =
          new rule.DeprecatedColorSettingShorthand().provideCodeActions(
            document,
            dummyRange,
            {
              diagnostics,
              triggerKind: CodeActionTriggerKind.Invoke,
              only: undefined,
            },
            dummyToken,
          )

        expect(codeActions).toHaveLength(2)
        expect(codeActions?.[0]).toBeInstanceOf(CodeAction)
        expect(codeActions?.[1]).toBeInstanceOf(CodeAction)

        // Quick fix action
        const textAction: CodeAction = codeActions?.[0]
        expect(textAction.kind).toBe(CodeActionKind.QuickFix)
        expect(textAction.diagnostics).toStrictEqual([diagnostics[0]])
        expect(textAction.edit).toBeInstanceOf(WorkspaceEdit)
        expect(textAction.isPreferred).toBe(true)
        expect(textAction.edit?.replace).toHaveBeenCalledTimes(1)
        expect(textAction.edit?.replace).toHaveBeenCalledWith(
          document.uri,
          new Range(new Position(0, 0), new Position(0, 12)),
          '<!-- _color: "#012abc" -->',
        )

        const bgAction: CodeAction = codeActions?.[1]
        expect(bgAction.kind).toBe(CodeActionKind.QuickFix)
        expect(bgAction.diagnostics).toStrictEqual([diagnostics[1]])
        expect(bgAction.edit).toBeInstanceOf(WorkspaceEdit)
        expect(bgAction.isPreferred).toBe(true)
        expect(bgAction.edit?.replace).toHaveBeenCalledTimes(1)
        expect(bgAction.edit?.replace).toHaveBeenCalledWith(
          document.uri,
          new Range(new Position(1, 0), new Position(1, 22)),
          '<!-- _backgroundColor: "rgba(1,2,3,0.5)" -->',
        )
      })

      it('does not create code actions when corresponding diagnostics have not passed', () => {
        const document = doc('![unknown](red)')
        const diagnostics = register(document)
        const codeActions =
          new rule.DeprecatedColorSettingShorthand().provideCodeActions(
            document,
            dummyRange,
            {
              diagnostics,
              triggerKind: CodeActionTriggerKind.Invoke,
              only: undefined,
            },
            dummyToken,
          )

        expect(codeActions).toHaveLength(0)
      })
    })
  })
})
