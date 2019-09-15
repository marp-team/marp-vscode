import { window, TextDocument } from 'vscode'
import * as diagnostics from './index' // tslint:disable-line: import-name

jest.mock('lodash.debounce')
jest.mock('vscode')

const plainTextDocMock: TextDocument = {
  languageId: 'plaintext',
  uri: '/plaintext',
} as any

const mdDocMock = (text: string): TextDocument =>
  ({
    getText: () => text,
    languageId: 'markdown',
    uri: '/markdown',
  } as any)

describe('Diagnostics', () => {
  describe('#subscribe', () => {
    it('adds diagnostic collection to subscriptions', () => {
      const subscriptions: any[] = []
      diagnostics.subscribe(subscriptions)

      expect(subscriptions).toContain(diagnostics.collection)
    })

    it('runs initial detection when text editor is active', () => {
      window.activeTextEditor = { document: plainTextDocMock } as any
      diagnostics.subscribe([])

      expect(diagnostics.collection.delete).toBeCalledWith('/plaintext')
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
      expect(diagnostics.collection.delete).toBeCalledWith('/plaintext')
    })

    it('resets diagnostics when passed markdown document without marp frontmatter', () => {
      diagnostics.refresh(mdDocMock('---\nfoo: bar\n---\n\n# Hello'))
      expect(diagnostics.collection.delete).toBeCalledWith('/markdown')
    })

    it('sets diagnostics when passed markdown document with marp frontmatter', () => {
      diagnostics.refresh(mdDocMock('---\nmarp: true\n---\n\n# Hello'))
      expect(diagnostics.collection.delete).not.toBeCalled()
    })
  })
})
