import { nextTick } from 'node:process'
import dedent from 'dedent'
import {
  Disposable,
  Position,
  Range,
  TextEditor,
  window,
  workspace,
} from 'vscode'
import { LanguageParser } from './parser'

jest.mock('lodash.debounce')
jest.mock('vscode')

describe('Language parser', () => {
  describe('constructor', () => {
    const textEditorMock: TextEditor = { document: {} } as any

    beforeEach(() => {
      window.activeTextEditor = textEditorMock
    })

    it('subscribes VS Code events to manage the state of parsing Marp Markdown', () => {
      const onDidChangeActiveTextEditorMock = jest
        .spyOn(window, 'onDidChangeActiveTextEditor')
        .mockReturnValue('onDidChangeActiveTextEditor' as any)

      const onDidChangeTextDocumentMock = jest
        .spyOn(workspace, 'onDidChangeTextDocument')
        .mockReturnValue('onDidChangeTextDocument' as any)

      const onDidCloseTextDocumentMock = jest
        .spyOn(workspace, 'onDidCloseTextDocument')
        .mockReturnValue('onDidCloseTextDocument' as any)

      try {
        const subscriptons: Disposable[] = []
        const parser = new LanguageParser(subscriptons)

        expect(subscriptons).toContain(parser)
        expect(subscriptons).toContain('onDidChangeActiveTextEditor')
        expect(subscriptons).toContain('onDidChangeTextDocument')
        expect(subscriptons).toContain('onDidCloseTextDocument')

        expect(parser.activeEditor).toBe(textEditorMock)
      } finally {
        onDidChangeActiveTextEditorMock.mockRestore()
        onDidChangeTextDocumentMock.mockRestore()
        onDidCloseTextDocumentMock.mockRestore()
      }
    })

    it('notifies to parse active text editor initially', () => {
      const notifyToParse = jest
        .spyOn(LanguageParser.prototype as any, 'notifyToParse')
        .mockImplementation()

      try {
        new LanguageParser([])

        expect(notifyToParse).toHaveBeenCalledTimes(1)
        expect(notifyToParse).toHaveBeenCalledWith(textEditorMock.document)
      } finally {
        notifyToParse.mockRestore()
      }
    })
  })

  it('parses Marp Markdown in managed documents', async () => {
    const document = {
      languageId: 'markdown',
      getText: () =>
        dedent(`
          ---
          marp: true
          theme: default
          test: test
          ---

          <!--
          paginate: true
          -->
          <!-- _paginate: false -->
        `),
      positionAt(offset: number) {
        const lines = this.getText().slice(0, offset).split('\n')

        return new Position(lines.length - 1, lines.pop()!.length)
      },
    }
    window.activeTextEditor = { document } as any

    const parser = new LanguageParser([])
    const data = await parser.getParseData(document as any)

    expect(data).toBeTruthy()
    expect(data?.commentRanges).toHaveLength(2)
    expect(data?.frontMatterRange).toBeInstanceOf(Range)
    expect(data?.directives).toHaveLength(4)

    // Range data
    expect(data?.directives[0].range.start).toMatchObject({
      line: 1,
      character: 0,
    })
    expect(data?.directives[0].range.end).toMatchObject({
      line: 1,
      character: 10,
    })
    expect(data?.directives[1].range.start).toMatchObject({
      line: 2,
      character: 0,
    })
    expect(data?.directives[1].range.end).toMatchObject({
      line: 2,
      character: 14,
    })
    expect(data?.directives[2].range.start).toMatchObject({
      line: 7,
      character: 0,
    })
    expect(data?.directives[2].range.end).toMatchObject({
      line: 7,
      character: 14,
    })
    expect(data?.directives[3].range.start).toMatchObject({
      line: 9,
      character: 5,
    })
    expect(data?.directives[3].range.end).toMatchObject({
      line: 9,
      character: 21,
    })
  })

  it('has correct source map even if used CR+LF newline', async () => {
    const document = {
      languageId: 'markdown',
      getText: () => {
        const baseDoc = dedent(`
          ---
          marp: true
          theme: default
          test: test
          ---

          <!--
          paginate: true
          -->
          <!-- _paginate: false -->
        `)

        return baseDoc.split('\n').join('\r\n')
      },
      positionAt(offset: number) {
        const lines = this.getText().slice(0, offset).split('\n')

        return new Position(lines.length - 1, lines.pop()!.length)
      },
    }
    window.activeTextEditor = { document } as any

    const parser = new LanguageParser([])
    const data = await parser.getParseData(document as any)

    expect(data).toBeTruthy()
    expect(data?.directives[0].range.start).toMatchObject({
      line: 1,
      character: 0,
    })
    expect(data?.directives[0].range.end).toMatchObject({
      line: 1,
      character: 10,
    })
    expect(data?.directives[1].range.start).toMatchObject({
      line: 2,
      character: 0,
    })
    expect(data?.directives[1].range.end).toMatchObject({
      line: 2,
      character: 14,
    })
    expect(data?.directives[2].range.start).toMatchObject({
      line: 7,
      character: 0,
    })
    expect(data?.directives[2].range.end).toMatchObject({
      line: 7,
      character: 14,
    })
    expect(data?.directives[3].range.start).toMatchObject({
      line: 9,
      character: 5,
    })
    expect(data?.directives[3].range.end).toMatchObject({
      line: 9,
      character: 21,
    })
  })

  it('does not parse Markdown when it is not Marp Markdown', async () => {
    const document = {
      languageId: 'markdown',
      getText: () => '',
      positionAt: (idx: number) => new Position(0, idx),
    }
    window.activeTextEditor = { document } as any

    const parser = new LanguageParser([])

    // Bypass the check while getting parsed data
    const isEnabledLanguageForMock = jest
      .spyOn(parser as any, 'isEnabledLanguageFor')
      .mockReturnValue(true)

    try {
      const data = await parser.getParseData(document as any)
      expect(data).toBeUndefined()
    } finally {
      isEnabledLanguageForMock.mockRestore()
    }
  })

  it('parses the Marp document when it was updated', async () => {
    const eventSpy = jest.spyOn(workspace, 'onDidChangeTextDocument')
    const parser = new LanguageParser([])

    expect(eventSpy).toHaveBeenCalledTimes(1)
    expect(eventSpy).toHaveBeenCalledWith(expect.any(Function))

    const [onDidChangeTextDocument] = eventSpy.mock.calls[0]
    const mockEvent = {
      document: {
        languageId: 'markdown',
        getText: () => '---\nmarp: true\n---',
        positionAt: (idx: number) => new Position(0, idx),
      },
    }
    onDidChangeTextDocument(mockEvent as any)

    const data = await parser.getParseData(mockEvent.document as any)
    expect(data).toBeTruthy()
    expect(data?.directives).toHaveLength(1)
  })

  it('emits activeEditorUpdated event if updated the content of active editor', () => {
    expect.hasAssertions()

    const document = {
      languageId: 'markdown',
      getText: () => '---\nmarp: true\n---',
      positionAt: (idx: number) => new Position(0, idx),
    }
    window.activeTextEditor = { document } as any

    const eventSpy = jest.spyOn(workspace, 'onDidChangeTextDocument')
    const parser = new LanguageParser([])

    parser.on('activeEditorUpdated', (editor, data) => {
      expect(editor).toStrictEqual(window.activeTextEditor)
      expect(data).toBeTruthy()
      expect(data?.directives).toHaveLength(1)
    })

    const [onDidChangeTextDocument] = eventSpy.mock.calls[0]
    onDidChangeTextDocument({ document } as any)
  })

  it('emits activeEditorDisposed event when a managed active editor was closed', () => {
    expect.hasAssertions()

    const document: any = {}
    window.activeTextEditor = { document } as any

    const eventSpy = jest.spyOn(workspace, 'onDidCloseTextDocument')
    const parser = new LanguageParser([])

    parser.on('activeEditorDisposed', (editor) => {
      expect(editor).toStrictEqual(window.activeTextEditor)
    })

    const [onDidCloseTextDocument] = eventSpy.mock.calls[0]
    onDidCloseTextDocument(document)
  })

  describe('#getParseData', () => {
    describe('with ensureLatest option', () => {
      beforeEach(() => jest.useFakeTimers())
      afterEach(() => jest.useRealTimers())

      const wait = () =>
        new Promise<void>((res) => {
          // Modern fake timers will mock nextTick function. We have to use
          // original function through _nextTick in Clock instance.
          //
          // https://github.com/facebook/jest/issues/10221
          // https://github.com/sinonjs/fake-timers/blob/master/src/fake-timers-src.js
          ;(nextTick as any).clock._nextTick(res)
        })

      it('tries to wait for a time to call debounce function if the data ws not yet ready', async () => {
        expect.assertions(3)

        const parser = new LanguageParser([])
        const isEnabledLanguageForMock = jest
          .spyOn(parser as any, 'isEnabledLanguageFor')
          .mockReturnValue(true)

        try {
          let resolved = false
          parser.getParseData({} as any, true).then(() => {
            resolved = true
          })

          await wait()
          expect(resolved).toBe(false)

          // Check whether #getParseData has margin time
          jest.advanceTimersByTime(parser.waitForDebounce)
          await wait()
          expect(resolved).toBe(false)

          jest.advanceTimersByTime(50)
          await wait()
          expect(resolved).toBe(true)
        } finally {
          isEnabledLanguageForMock.mockRestore()
        }
      })

      it('also makes delay if a passed document has different version from parsed document', async () => {
        expect.assertions(2)

        const document = {
          languageId: 'markdown',
          getText: () => '---\nmarp: true\n---',
          positionAt: (idx: number) => new Position(0, idx),
          version: 0,
        }

        window.activeTextEditor = { document } as any
        const parser = new LanguageParser([])

        // Update version
        document.version = 1

        let resolved = false
        parser.getParseData(document as any, true).then(() => {
          resolved = true
        })

        await wait()
        expect(resolved).toBe(false)

        jest.advanceTimersByTime(parser.waitForDebounce + 50)
        await wait()
        expect(resolved).toBe(true)
      })
    })
  })

  describe('#dispose', () => {
    it('disposes mapped data', () => {
      const mapClearSpy = jest.spyOn(Map.prototype, 'clear')
      const document = {
        languageId: 'markdown',
        getText: () => '---\nmarp: true\n---',
        positionAt: (idx: number) => new Position(0, idx),
      }

      window.activeTextEditor = { document } as any

      new LanguageParser([]).dispose()
      expect(mapClearSpy).toHaveBeenCalled()
    })
  })
})
