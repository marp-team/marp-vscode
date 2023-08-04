import dedent from 'dedent'
import {
  languages,
  window,
  Position,
  Range,
  TextDocument,
  CompletionList,
  Uri,
} from 'vscode'
import { Themes } from '../themes'
import { register } from './completions'
import { LanguageParser } from './parser'

describe('Auto completions', () => {
  it('registers completion provider to subscriptions', () => {
    const mockedCompletionProvider = {} as any
    const mockedCompletionProviderMock = jest
      .spyOn(languages, 'registerCompletionItemProvider')
      .mockReturnValue(mockedCompletionProvider)

    try {
      const subscriptions: any[] = []

      register(subscriptions, {} as any)
      expect(subscriptions).toContain(mockedCompletionProvider)
    } finally {
      mockedCompletionProviderMock.mockRestore()
    }
  })

  describe('#provideCompletionItems', () => {
    const setDocument = (markdown: string): TextDocument => {
      const document: any = {
        languageId: 'markdown',
        getText: (range?: Range) => {
          if (!range) return markdown

          const lines = markdown.split('\n')
          const offset = (position: Position) => {
            const ls = lines.slice(0, position.line + 1)

            ls[ls.length - 1] = ls[ls.length - 1].slice(0, position.character)
            return ls.join('\n').length
          }

          const startOffset = offset(range.start)
          const endOffset = offset(range.end)

          return markdown.slice(startOffset, endOffset)
        },
        getWordRangeAtPosition: (position: Position, regex = /[\s\w-]+/) => {
          const line = markdown.split('\n')[position.line]
          if (!line) return undefined

          // simple match
          const matched = line.match(regex)
          if (!matched || matched.index === undefined) return undefined

          const range = new Range(
            new Position(position.line, matched.index),
            new Position(position.line, matched.index + matched[0].length),
          )

          if (range.contains(new Position(position.line, position.character))) {
            return range
          }

          return undefined
        },
        positionAt: (offset: number) => {
          const lines = markdown.slice(0, offset).split('\n')

          return new Position(lines.length - 1, lines.pop()!.length)
        },
        uri: Uri.parse('/test/document'),
        fileName: '/test/document',
      }

      window.activeTextEditor = { document } as any
      return document
    }

    const provideCompletionItems = (
      parser: LanguageParser = new LanguageParser([]),
    ) => {
      const spy = jest.spyOn(languages, 'registerCompletionItemProvider')

      register([], parser)

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        'markdown',
        expect.objectContaining({
          provideCompletionItems: expect.any(Function),
        }),
      )

      return spy.mock.calls[0][1].provideCompletionItems
    }

    describe('Directive suggestion', () => {
      it('suggests directives in a front-matter', async () => {
        const doc = setDocument('---\nmarp: true\n\n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 0),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "author",
            "backgroundColor",
            "backgroundImage",
            "backgroundPosition",
            "backgroundRepeat",
            "backgroundSize",
            "class",
            "color",
            "description",
            "footer",
            "header",
            "headingDivider",
            "image",
            "keywords",
            "marp",
            "math",
            "paginate",
            "size",
            "style",
            "theme",
            "title",
            "transition",
            "url",
          ]
        `)

        // The insert text has semicolon
        expect(list.items[0].insertText).toBe(`${list.items[0].label}: `)
      })

      it('suggests directives except "marp" in a comment', async () => {
        const doc = setDocument('---\nmarp: true\n---\n\n<!--  -->')
        const list = (await provideCompletionItems()(
          doc,
          new Position(4, 5),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "author",
            "backgroundColor",
            "backgroundImage",
            "backgroundPosition",
            "backgroundRepeat",
            "backgroundSize",
            "class",
            "color",
            "description",
            "footer",
            "header",
            "headingDivider",
            "image",
            "keywords",
            "math",
            "paginate",
            "size",
            "style",
            "theme",
            "title",
            "transition",
            "url",
          ]
        `)
        expect(labels).not.toContain('marp')
      })

      it('suggests only local directives if a line has started with underscore', async () => {
        const doc = setDocument('---\nmarp: true\n_:\n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 0),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "backgroundColor",
            "backgroundImage",
            "backgroundPosition",
            "backgroundRepeat",
            "backgroundSize",
            "class",
            "color",
            "footer",
            "header",
            "paginate",
            "transition",
          ]
        `)

        // The insert text has not semicolon because it has already in an original text
        expect(list.items[0].insertText).not.toMatch(/: $/)
      })

      it('does not suggest when directives are not accepted in the cursor position', async () => {
        const doc = setDocument('---\nmarp: true\n---\n\n')
        const list = (await provideCompletionItems()(
          doc,
          new Position(4, 0),
          {} as any,
          {} as any,
        )) as CompletionList

        expect(list).toBeUndefined()
      })
    })

    describe('Theme suggestion', () => {
      it('suggests themes when the cursor is on theme directive', async () => {
        const doc = setDocument('---\nmarp: true\ntheme: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 7),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "default",
            "gaia",
            "uncover",
          ]
        `)
      })

      it('suggests the name of custom theme when recognized', async () => {
        const getRegisteredStylesMock = jest
          .spyOn(Themes.prototype, 'getRegisteredStyles')
          .mockReturnValue([{ css: '/* @theme custom-theme */' } as any])

        try {
          const doc = setDocument('---\nmarp: true\ntheme: \n---')
          const list = (await provideCompletionItems()(
            doc,
            new Position(2, 7),
            {} as any,
            {} as any,
          )) as CompletionList

          const labels = list.items.map((item) => item.label).sort()

          expect(labels).toMatchInlineSnapshot(`
            [
              "custom-theme",
              "default",
              "gaia",
              "uncover",
            ]
          `)
          expect(labels).toContain('custom-theme')
        } finally {
          getRegisteredStylesMock.mockRestore()
        }
      })
    })

    describe('Paginate directive suggestion', () => {
      it('suggests acceptable values for paginate directive when the cursor is on the directive', async () => {
        const doc = setDocument('---\nmarp: true\npaginate: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 10),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "false",
            "hold",
            "skip",
            "true",
          ]
        `)
      })
    })

    describe('Math suggestion', () => {
      it('suggests math library when the cursor is on math directive', async () => {
        const doc = setDocument('---\nmarp: true\nmath: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 6),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "katex",
            "mathjax",
          ]
        `)
      })
    })

    describe('Size preset suggestion', () => {
      it('suggests size presets defined in used theme when the cursor is on size directive', async () => {
        const doc = setDocument('---\nmarp: true\nsize: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 6),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "16:9",
            "4:3",
          ]
        `)
      })

      it('suggests size presets strictly defined in used custom theme', async () => {
        const getRegisteredStylesMock = jest
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

        try {
          const doc = setDocument(
            '---\nmarp: true\ntheme: custom-theme\nsize: \n---',
          )
          const list = (await provideCompletionItems()(
            doc,
            new Position(3, 6),
            {} as any,
            {} as any,
          )) as CompletionList

          const labels = list.items.map((item) => item.label).sort()

          expect(labels).toMatchInlineSnapshot(`
                      [
                        "16:9",
                        "a4",
                      ]
                  `)
        } finally {
          getRegisteredStylesMock.mockRestore()
        }
      })

      it('fallback to presets for the default theme if specified theme is not registered', async () => {
        const doc = setDocument('---\nmarp: true\ntheme: unknown\nsize: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(3, 6),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "16:9",
            "4:3",
          ]
        `)
      })
    })

    describe('Built-in transitions suggestion', () => {
      it('suggests transition when the cursor is on transition directive', async () => {
        const doc = setDocument('---\nmarp: true\ntransition: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 12),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "clockwise",
            "counterclockwise",
            "cover",
            "coverflow",
            "cube",
            "cylinder",
            "diamond",
            "drop",
            "explode",
            "fade",
            "fade-out",
            "fall",
            "flip",
            "glow",
            "implode",
            "in-out",
            "iris-in",
            "iris-out",
            "melt",
            "none",
            "overlap",
            "pivot",
            "pull",
            "push",
            "reveal",
            "rotate",
            "slide",
            "star",
            "swap",
            "swipe",
            "swoosh",
            "wipe",
            "wiper",
            "zoom",
          ]
        `)
      })

      it('suggests transition when the cursor is on transition scoped directive', async () => {
        const doc = setDocument('---\nmarp: true\n_transition: \n---')
        const list = (await provideCompletionItems()(
          doc,
          new Position(2, 13),
          {} as any,
          {} as any,
        )) as CompletionList

        const labels = list.items.map((item) => item.label).sort()

        expect(labels).toMatchInlineSnapshot(`
          [
            "clockwise",
            "counterclockwise",
            "cover",
            "coverflow",
            "cube",
            "cylinder",
            "diamond",
            "drop",
            "explode",
            "fade",
            "fade-out",
            "fall",
            "flip",
            "glow",
            "implode",
            "in-out",
            "iris-in",
            "iris-out",
            "melt",
            "none",
            "overlap",
            "pivot",
            "pull",
            "push",
            "reveal",
            "rotate",
            "slide",
            "star",
            "swap",
            "swipe",
            "swoosh",
            "wipe",
            "wiper",
            "zoom",
          ]
        `)
      })
    })
  })
})
