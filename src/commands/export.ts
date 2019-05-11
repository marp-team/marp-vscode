import path from 'path'
import { env, ProgressLocation, TextDocument, Uri, window } from 'vscode'
import marpCli, {
  createConfigFile,
  createWorkFile,
  MarpCLIError,
} from '../marp-cli'

export const ITEM_CONTINUE_TO_EXPORT = 'Continue to export...'

export const doExport = async (uri: Uri, document: TextDocument) => {
  const input = await createWorkFile(document)

  try {
    const conf = await createConfigFile(document)

    try {
      await marpCli('-c', conf.path, input.path, '-o', uri.fsPath)
      env.openExternal(uri)
    } finally {
      conf.cleanup()
    }
  } catch (e) {
    window.showErrorMessage(
      `Failure to export. ${
        e instanceof MarpCLIError ? e.message : e.toString()
      }`
    )
  } finally {
    input.cleanup()
  }
}

export const saveDialog = async (document: TextDocument) => {
  const { fsPath } = document.uri

  const saveURI = await window.showSaveDialog({
    defaultUri: Uri.file(fsPath.slice(0, -path.extname(fsPath).length)),
    filters: {
      'PDF slide deck': ['pdf'],
      'HTML slide deck': ['html'],
      'PNG image (first slide only)': ['png'],
      'JPEG image (first slide only)': ['jpg', 'jpeg'],
    },
    saveLabel: 'Export',
  })

  if (saveURI) {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `Exporting Marp slide deck to ${saveURI.path}...`,
      },
      () => doExport(saveURI, document)
    )
  }
}

export default async function exportCommand() {
  const activeEditor = window.activeTextEditor

  if (activeEditor) {
    if (activeEditor.document.languageId === 'markdown') {
      await saveDialog(activeEditor.document)
    } else {
      const acted = await window.showWarningMessage(
        'A current document is not Markdown document.',
        ITEM_CONTINUE_TO_EXPORT
      )

      if (acted === ITEM_CONTINUE_TO_EXPORT) {
        await saveDialog(activeEditor.document)
      }
    }
  }
}
