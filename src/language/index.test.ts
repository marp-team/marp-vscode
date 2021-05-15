import { languages, Hover, Position, Range, TextDocument } from 'vscode'
import { DirectiveType } from '../directives/parser'
import { LanguageParser } from './parser'
import { register } from './index'

jest.mock('vscode')

describe('Language extension', () => {
  describe('Decorations', () => {
    const languageParser = () => {
      const subscriptions: any[] = []
      register(subscriptions)

      const langParser: LanguageParser = subscriptions.find(
        (subscribed) => subscribed instanceof LanguageParser
      )
      expect(langParser).toBeInstanceOf(LanguageParser)

      return langParser
    }

    it('sets decorations to directives when updated the active editor', () => {
      const parser = languageParser()
      const editorMock = { setDecorations: jest.fn() }

      const dummyRangeG = new Range(new Position(0, 0), new Position(0, 10))
      const dummyRangeL = new Range(new Position(1, 0), new Position(1, 10))

      parser.emit(
        'activeEditorUpdated',
        editorMock as any,
        {
          directvies: [
            { info: { type: DirectiveType.Global }, keyRange: dummyRangeG },
            { info: { type: DirectiveType.Local }, keyRange: dummyRangeL },
          ],
        } as any
      )

      expect(editorMock.setDecorations).toHaveBeenCalledWith(
        expect.objectContaining({ fontWeight: 'bold' }), // for directive keys
        [dummyRangeG, dummyRangeL]
      )
      expect(editorMock.setDecorations).toHaveBeenCalledWith(
        expect.objectContaining({ fontStyle: 'italic' }), // for global directive keys
        [dummyRangeG]
      )
    })

    it('clears decorations when dispoed the active editor', () => {
      const parser = languageParser()
      const editorMock = { setDecorations: jest.fn() }

      parser.emit('activeEditorDisposed', editorMock as any)

      expect(editorMock.setDecorations).toHaveBeenCalledWith(
        expect.objectContaining({ fontWeight: 'bold' }), // for directive keys
        []
      )
      expect(editorMock.setDecorations).toHaveBeenCalledWith(
        expect.objectContaining({ fontStyle: 'italic' }), // for global directive keys
        []
      )
    })
  })

  describe('Hover help', () => {
    it('registers hover provider to subscriptions', () => {
      const mockedHoverProvider = {
        dispose: () => {
          // test
        },
      }

      jest
        .spyOn(languages, 'registerHoverProvider')
        .mockReturnValue(mockedHoverProvider)

      const subscriptions: any[] = []
      register(subscriptions)

      expect(subscriptions).toContain(mockedHoverProvider)
    })

    it('provides hover when the cursor is containing in the range of directive', async () => {
      const registerSpy = jest.spyOn(languages, 'registerHoverProvider')

      register([])

      expect(registerSpy).toHaveBeenCalledTimes(1)
      expect(registerSpy).toHaveBeenCalledWith(
        'markdown',
        expect.objectContaining({ provideHover: expect.any(Function) })
      )

      // Call providerHover
      const docMock: TextDocument = {} as any
      const ignoredRange = Object.assign(
        new Range(new Position(0, 0), new Position(0, 10)),
        { contains: jest.fn().mockReturnValue(false) }
      )
      const range = Object.assign(
        new Range(new Position(1, 0), new Position(1, 10)),
        { contains: jest.fn().mockReturnValue(true) }
      )

      const getParseDataSpy = jest
        .spyOn(LanguageParser.prototype, 'getParseData')
        .mockResolvedValue({
          directvies: [
            { info: {}, range: ignoredRange },
            { info: {}, range },
          ],
        } as any)

      const { provideHover } = registerSpy.mock.calls[0][1]
      const hover = await provideHover(docMock, new Position(0, 0), {} as any)

      expect(getParseDataSpy).toHaveBeenCalledWith(docMock)
      expect(hover).toBeInstanceOf(Hover)
    })

    it('does not provide hover if the parsed document data is not provided', async () => {
      const registerSpy = jest.spyOn(languages, 'registerHoverProvider')
      register([])

      jest
        .spyOn(LanguageParser.prototype, 'getParseData')
        .mockResolvedValue(undefined)

      const provideHover: any = registerSpy.mock.calls[0][1].provideHover
      const hover = await provideHover()

      expect(hover).toBeUndefined()
    })
  })
})
