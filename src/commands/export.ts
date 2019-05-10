import path from 'path'
import { env, ProgressLocation, TextEditor, Uri, window } from 'vscode'
import marpCli, {
  createConfigFile,
  createWorkFile,
  MarpCLIError,
} from '../marp-cli'

export default async function exportCommand() {
  const doExport = async ({ document }: TextEditor) => {
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
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Exporting Marp slide deck to ${saveURI.path}...`,
        },
        async () => {
          const input = await createWorkFile(document)

          try {
            const conf = await createConfigFile(document)

            try {
              await marpCli('-c', conf.path, input.path, '-o', saveURI.fsPath)
              env.openExternal(saveURI)
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
      )
    }
  }

  const activeEditor = window.activeTextEditor

  if (activeEditor) {
    if (activeEditor.document.languageId === 'markdown') {
      doExport(activeEditor)
    } else {
      const continueItem = 'Continue to export...'
      const acted = await window.showWarningMessage(
        'A current document is not Markdown document.',
        continueItem
      )

      if (acted === continueItem) doExport(activeEditor)
    }
  }
}
