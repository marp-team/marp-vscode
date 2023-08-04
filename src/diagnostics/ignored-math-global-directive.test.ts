import {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
  workspace,
} from 'vscode'
import { DirectiveParser } from '../directives/parser'
import * as rule from './ignored-math-global-directive'

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
  }) as any

const setConfiguration: (conf?: Record<string, unknown>) => void = (
  workspace as any
)._setConfiguration

describe('[Diagnostics rule] Ignored math global directive', () => {
  const register = (doc: TextDocument): Diagnostic[] => {
    const parser = new DirectiveParser()
    const diagnostics: Diagnostic[] = []

    rule.register(doc, parser, diagnostics)

    parser.parse(doc)
    return diagnostics
  }

  describe('#register', () => {
    it('adds diagnostics when using math global directive with disabled math feature', () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'off' })

      const diagnostics = register(doc('<!-- math: mathjax -->'))
      expect(diagnostics).toHaveLength(1)

      const [diagnostic] = diagnostics
      expect(diagnostic).toBeInstanceOf(Diagnostic)
      expect(diagnostic.code).toBe(rule.code)
      expect(diagnostic.source).toBe('marp-vscode')
      expect(diagnostic.severity).toBe(DiagnosticSeverity.Information)
      expect(diagnostic.range).toStrictEqual(
        new Range(new Position(0, 5), new Position(0, 9)),
      )
    })

    it('does not add diagnostics when not used math global directive', () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'off' })

      const diagnostics = register(doc('<!-- marp: true -->'))
      expect(diagnostics).toHaveLength(0)
    })

    it('does not add diagnostics when enabled math feature even if used math global directive', () => {
      setConfiguration({ 'markdown.marp.mathTypesetting': 'mathjax' })

      const diagnostics = register(doc('<!-- math: katex -->'))
      expect(diagnostics).toHaveLength(0)
    })
  })

  describe('#subscribe', () => {
    it('subscribes onDidChangeConfiguration event to trigger refresh', () => {
      const subscriptions: any[] = []
      const refresh = jest.fn()

      rule.subscribe(subscriptions, refresh)

      expect(workspace.onDidChangeConfiguration).toHaveBeenCalledWith(
        expect.any(Function),
      )

      const [callback] = (workspace.onDidChangeConfiguration as jest.Mock).mock
        .calls[0]

      callback({ affectsConfiguration: jest.fn(() => true) })
      expect(refresh).toHaveBeenCalled()
    })
  })
})
