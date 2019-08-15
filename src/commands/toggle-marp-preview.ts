import { Position, Range, TextEditor, languages, window } from 'vscode'
import { detectFrontMatter, marpDirectiveRegex } from '../utils'

export const ITEM_CONTINUE_BY_CHANGING_LANGUAGE =
  'Continue by changing language to Markdown'

export const toggle = async (editor: TextEditor) => {
  const originalText = editor.document.getText()
  const frontmatter = detectFrontMatter(originalText)

  if (frontmatter !== undefined) {
    let line = 1
    let targetRange: Range | undefined
    let toggleValue: string | undefined

    for (const lText of frontmatter.split('\n')) {
      const matched = marpDirectiveRegex.exec(lText)

      if (matched) {
        targetRange = new Range(
          new Position(line, matched[1].length),
          new Position(line, matched[1].length + matched[2].length)
        )
        toggleValue = matched[2] === 'true' ? 'false' : 'true'
      }

      line += 1
    }

    if (targetRange && toggleValue) {
      await editor.edit(e => e.replace(targetRange!, toggleValue!))
    } else {
      await editor.edit(e =>
        e.insert(new Position(line - 1, 0), 'marp: true\n')
      )
    }
  } else {
    await editor.edit(e =>
      e.insert(new Position(0, 0), '---\nmarp: true\n---\n\n')
    )
  }
}

export default async function toggleMarpPreview() {
  const activeEditor = window.activeTextEditor

  if (activeEditor) {
    if (activeEditor.document.languageId === 'markdown') {
      await toggle(activeEditor)
    } else {
      const acted = await window.showWarningMessage(
        'A current document is not Markdown document. Do you want to continue by changing language?',
        ITEM_CONTINUE_BY_CHANGING_LANGUAGE
      )

      if (acted === ITEM_CONTINUE_BY_CHANGING_LANGUAGE) {
        await languages.setTextDocumentLanguage(
          activeEditor.document,
          'markdown'
        )
        await toggle(activeEditor)
      }
    }
  }
}
