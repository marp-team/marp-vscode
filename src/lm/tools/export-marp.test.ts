import path from 'node:path'
import {
  workspace,
  LanguageModelTextPart,
  LanguageModelToolResult,
  MarkdownString,
  Uri,
} from 'vscode'
import * as exportCommand from '../../commands/export'
import { ExportMarpTool } from './export-marp'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ExportMarpTool class', () => {
  const input = {
    inputFilePath: path.join('foo', 'bar', 'test.md'),
    outputFilePath: path.join('foo', 'bar', 'test.pdf'),
  }

  describe('#prepareInvocation', () => {
    const tool = new ExportMarpTool()

    it('returns the invocation message and confirmation messages', () => {
      const ret = tool.prepareInvocation({ input })

      expect(ret).toStrictEqual({
        invocationMessage: 'Export Marp Slide Deck',
        confirmationMessages: {
          title: 'Export Marp Slide Deck',
          message: new MarkdownString(
            `Export "test.md" to **"${input.outputFilePath}"**.`,
          ),
        },
      })
    })
  })

  describe('#invoke', () => {
    const tool = new ExportMarpTool()

    it('invokes the export command to opened input document, and return language model text', async () => {
      const textDocument: any = 'mockTextDocument'

      jest.spyOn(workspace, 'openTextDocument').mockResolvedValue(textDocument)

      const doExportMock = jest
        .spyOn(exportCommand, 'doExport')
        .mockResolvedValue({
          uri: Uri.file(input.outputFilePath),
        })

      const ret = await tool.invoke({ input, toolInvocationToken: undefined })

      expect(doExportMock).toHaveBeenCalledWith(
        Uri.file(input.outputFilePath),
        textDocument,
      )

      expect(ret).toBeInstanceOf(LanguageModelToolResult)
      expect(ret.content).toHaveLength(1)
      expect(ret.content[0]).toStrictEqual(
        new LanguageModelTextPart(
          'The slide deck was successfully exported to "file:///foo/bar/test.pdf".',
        ),
      )
    })

    it('returns language model text with error message if export fails', async () => {
      const spy = jest.spyOn(exportCommand, 'doExport')

      // Throw an error
      spy.mockRejectedValue(new Error('Export failed'))

      const errorRet = await tool.invoke({
        input,
        toolInvocationToken: undefined,
      })

      expect(errorRet).toBeInstanceOf(LanguageModelToolResult)
      expect(errorRet.content).toHaveLength(1)
      expect(errorRet.content[0]).toStrictEqual(
        new LanguageModelTextPart(
          'The export process failed. Error details:\n\nExport failed',
        ),
      )

      // Unexpected error
      spy.mockRejectedValue('Unexpected error')
      const invalidErrorRet = await tool.invoke({
        input,
        toolInvocationToken: undefined,
      })

      expect(invalidErrorRet).toBeInstanceOf(LanguageModelToolResult)
      expect(invalidErrorRet.content).toHaveLength(1)
      expect(invalidErrorRet.content[0]).toStrictEqual(
        new LanguageModelTextPart(
          'The export process failed. Error details:\n\nUnknown error (Unexpected error)',
        ),
      )
    })

    it('returns language model text with error message if the current workspace is not trusted', async () => {
      jest.spyOn(workspace, 'isTrusted', 'get').mockReturnValue(false)

      const ret = await tool.invoke({ input, toolInvocationToken: undefined })

      expect(ret).toBeInstanceOf(LanguageModelToolResult)
      expect(ret.content).toHaveLength(1)
      expect(ret.content[0]).toStrictEqual(
        new LanguageModelTextPart(
          'Export cannot be performed in a not trusted workspace.',
        ),
      )
    })
  })
})
