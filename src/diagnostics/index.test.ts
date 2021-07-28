import { window, TextDocument, Position } from 'vscode'
import { DirectiveParser } from '../directives/parser'
import * as deprecatedDollarPrefix from './deprecated-dollar-prefix'
import * as mathGlobalDirective from './math-global-directive'
import * as overloadingGlobalDirective from './overloading-global-directive'
import * as unknownTheme from './unknown-theme'
import * as diagnostics from './index'

jest.mock('lodash.debounce')
jest.mock('vscode')
jest.mock('./deprecated-dollar-prefix')
jest.mock('./math-global-directive')
jest.mock('./overloading-global-directive')
jest.mock('./unknown-theme')

const plainTextDocMock: TextDocument = {
  languageId: 'plaintext',
  uri: '/plaintext',
} as any

const mdDocMock = (text: string): TextDocument =>
  ({
    getText: () => text,
    languageId: 'markdown',
    uri: '/markdown',
    positionAt: (idx: number) => new Position(0, idx),
  } as any)

describe('Diagnostics', () => {
  describe('#subscribe', () => {
    it('adds diagnostic collection and rules to subscriptions', () => {
      const subscriptions: any[] = []
      diagnostics.subscribe(subscriptions)

      // Collection
      expect(subscriptions).toContain(diagnostics.collection)

      // Actions
      expect(deprecatedDollarPrefix.subscribe).toHaveBeenCalledWith(
        subscriptions
      )
      expect(mathGlobalDirective.subscribe).toHaveBeenCalledWith(
        subscriptions,
        expect.any(Function)
      )
    })

    it('runs initial detection when text editor is active', () => {
      window.activeTextEditor = { document: plainTextDocMock } as any
      diagnostics.subscribe([])

      expect(diagnostics.collection.delete).toHaveBeenCalledWith('/plaintext')
    })

    describe('Observer events', () => {
      it.todo('window.onDidChangeActiveTextEditor')
      it.todo('workspace.onDidChangeTextDocument')
      it.todo('workspace.onDidCloseTextDocument')
    })
  })

  describe('#refresh', () => {
    it('resets diagnostics when passed plain text document', () => {
      diagnostics.refresh(plainTextDocMock)
      expect(diagnostics.collection.delete).toHaveBeenCalledWith('/plaintext')
    })

    it('resets diagnostics when passed markdown document without marp frontmatter', () => {
      diagnostics.refresh(mdDocMock('---\nfoo: bar\n---\n\n# Hello'))
      expect(diagnostics.collection.delete).toHaveBeenCalledWith('/markdown')
    })

    it('sets diagnostics when passed markdown document with marp frontmatter', () => {
      const arr = expect.any(Array)
      const parser = expect.any(DirectiveParser)
      const doc = mdDocMock('---\nmarp: true\n---\n\n# Hello')
      diagnostics.refresh(doc)

      expect(diagnostics.collection.delete).not.toHaveBeenCalled()
      expect(diagnostics.collection.set).toHaveBeenCalledWith('/markdown', arr)

      // Rules
      expect(deprecatedDollarPrefix.register).toHaveBeenCalledWith(
        doc,
        parser,
        arr
      )
      expect(mathGlobalDirective.register).toHaveBeenCalledWith(
        doc,
        parser,
        arr
      )
      expect(overloadingGlobalDirective.register).toHaveBeenCalledWith(
        doc,
        parser,
        arr
      )
      expect(unknownTheme.register).toHaveBeenCalledWith(doc, parser, arr)
    })
  })
})
