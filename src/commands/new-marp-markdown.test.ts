import { window, workspace, Selection } from 'vscode'
import newMarpMarkdown from './new-marp-markdown'

jest.mock('vscode')

describe('newMarpMarkdown command', () => {
  it('opens new Markdown document with preset of frontmatter', async () => {
    const positionAt = jest.fn((pos: number) => pos as any)
    const openTextDocument = jest
      .spyOn(workspace, 'openTextDocument')
      .mockResolvedValue({ positionAt } as any)

    try {
      await newMarpMarkdown()

      expect(openTextDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringMatching(/^---\nmarp: true\n---/),
          language: 'markdown',
        })
      )

      const document = await openTextDocument.mock.results[0].value
      expect(window.showTextDocument).toHaveBeenCalledWith(document)

      const textEditor = await (window.showTextDocument as any).mock.results[0]
        .value
      expect(textEditor.selection).toStrictEqual(expect.any(Selection))
    } finally {
      openTextDocument.mockRestore()
    }
  })
})
