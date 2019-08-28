import path from 'path'
import { env, ProgressLocation, TextDocument, Uri, window } from 'vscode'
import { marpConfiguration } from '../utils'
import marpCli, {
  createConfigFile,
  createWorkFile,
  MarpCLIError,
} from '../marp-cli'

export enum Types {
  html = 'html',
  pdf = 'pdf',
  pptx = 'pptx',
  png = 'png',
  jpeg = 'jpeg',
}

const extensions = {
  [Types.html]: ['html'],
  [Types.pdf]: ['pdf'],
  [Types.pptx]: ['pptx'],
  [Types.png]: ['png'],
  [Types.jpeg]: ['jpg', 'jpeg'],
}

const descriptions = {
  [Types.html]: 'HTML slide deck',
  [Types.pdf]: 'PDF slide deck',
  [Types.pptx]: 'PowerPoint document',
  [Types.png]: 'PNG image (first slide only)',
  [Types.jpeg]: 'JPEG image (first slide only)',
}

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

  const defaultType = marpConfiguration().get<string>('exportType')!
  const baseTypes = Object.keys(extensions)
  const types = [...new Set<string>([defaultType, ...baseTypes])]

  const saveURI = await window.showSaveDialog({
    defaultUri: Uri.file(fsPath.slice(0, -path.extname(fsPath).length)),
    filters: types.reduce((f, t) => {
      if (baseTypes.includes(t)) f[descriptions[t]] = extensions[t]
      return f
    }, {}),
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
