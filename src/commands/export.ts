import { tmpdir } from 'os'
import path from 'path'
import { nanoid } from 'nanoid'
import {
  commands,
  env,
  ProgressLocation,
  TextDocument,
  Uri,
  window,
  workspace,
} from 'vscode'
import marpCli, {
  createConfigFile,
  createWorkFile,
  MarpCLIError,
} from '../marp-cli'
import { marpConfiguration, unlink } from '../utils'
import {
  createWorkspaceProxyServer,
  WorkspaceProxyServer,
} from '../workspace-proxy-server'

export enum Types {
  html = 'html',
  pdf = 'pdf',
  pptx = 'pptx',
  png = 'png',
  jpeg = 'jpeg',
}

const extensions = {
  [Types.html]: ['html'] as const,
  [Types.pdf]: ['pdf'] as const,
  [Types.pptx]: ['pptx'] as const,
  [Types.png]: ['png'] as const,
  [Types.jpeg]: ['jpg', 'jpeg'] as const,
}

const descriptions = {
  [Types.html]: 'HTML slide deck' as const,
  [Types.pdf]: 'PDF slide deck' as const,
  [Types.pptx]: 'PowerPoint document' as const,
  [Types.png]: 'PNG image (first slide only)' as const,
  [Types.jpeg]: 'JPEG image (first slide only)' as const,
}

export const ITEM_CONTINUE_TO_EXPORT = 'Continue to export...'
export const ITEM_MANAGE_WORKSPACE_TRUST = 'Manage Workspace Trust...'

export const command = 'markdown.marp.export'

const chromiumRequiredExtensions = [
  ...extensions.pdf,
  ...extensions.pptx,
  ...extensions.png,
  ...extensions.jpeg,
] as string[]

export const doExport = async (uri: Uri, document: TextDocument) => {
  let proxyServer: WorkspaceProxyServer | undefined
  let baseUrl: string | undefined

  const shouldProvideWorkspaceProxyServer = (() => {
    const ext = path.extname(uri.path).replace(/^\./, '')

    if (chromiumRequiredExtensions.includes(ext)) {
      // VS Code's Markdown preview may show local resources placed at the
      // outside of workspace, and using the proxy server in that case may too
      // much prevent file accesses.
      //
      // So leave handling local files to Marp CLI if the current document was
      // assumed to use local file system.
      return !['file', 'untitled'].includes(document.uri.scheme)
    }

    return false
  })()

  if (shouldProvideWorkspaceProxyServer) {
    const workspaceFolder = workspace.getWorkspaceFolder(document.uri)

    if (workspaceFolder) {
      proxyServer = await createWorkspaceProxyServer(workspaceFolder)
      baseUrl = `http://127.0.0.1:${proxyServer.port}${document.uri.path}`

      console.debug(
        `Proxy server for the workspace ${workspaceFolder.name} has created (port: ${proxyServer.port})`
      )
    }
  }

  try {
    const input = await createWorkFile(document)

    try {
      let outputPath = uri.fsPath

      const ouputExt = path.extname(uri.path)
      const outputToLocalFS = uri.scheme === 'file'

      // NOTE: It may return `undefined` if VS Code does not know about the
      // filesystem. In this case, Marp may be able to write to the output path.
      if (workspace.fs.isWritableFileSystem(uri.scheme) === false) {
        throw new Error(`Could not write to ${uri.scheme} file system.`)
      }

      if (!outputToLocalFS) {
        outputPath = path.join(
          tmpdir(),
          `marp-vscode-tmp-${nanoid()}${ouputExt}`
        )
      }

      // Run Marp CLI
      const conf = await createConfigFile(document, {
        allowLocalFiles: !proxyServer,
        pdfNotes:
          ouputExt === '.pdf' &&
          marpConfiguration().get<boolean>('pdf.noteAnnotations'),
      })

      try {
        await marpCli(['-c', conf.path, input.path, '-o', outputPath], {
          baseUrl,
        })

        if (outputToLocalFS) {
          env.openExternal(uri)
        } else {
          const outputUri = Uri.file(outputPath)

          try {
            await workspace.fs.copy(outputUri, uri, { overwrite: true })
          } finally {
            try {
              await unlink(outputUri)
            } catch (e) {
              // no ops
            }
          }

          window.showInformationMessage(
            `Marp slide deck was successfully exported to ${uri.toString()}.`
          )
        }
      } finally {
        conf.cleanup()
      }
    } catch (e) {
      window.showErrorMessage(
        `Failure to export${(() => {
          if (e instanceof MarpCLIError) return `. ${e.message}`
          if (e instanceof Error) return `: [${e.name}] ${e.message}`
          if (typeof e === 'object' && typeof e?.toString === 'function')
            return `. ${e.toString()}`

          return ' by unknown error.'
        })()}`
      )
    } finally {
      input.cleanup()
    }
  } finally {
    proxyServer?.dispose()
  }
}

export const saveDialog = async (document: TextDocument) => {
  const { fsPath } = document.uri

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const defaultType = marpConfiguration().get<string>('exportType')!
  const ext = extensions[defaultType] ? `.${extensions[defaultType][0]}` : ''
  const baseTypes = Object.keys(extensions)
  const types = [...new Set<string>([defaultType, ...baseTypes])]

  const saveURI = await window.showSaveDialog({
    defaultUri: Uri.file(
      (document.isUntitled
        ? 'untitled'
        : fsPath.slice(0, -path.extname(fsPath).length)) + ext
    ),
    filters: types.reduce((f, t) => {
      if (baseTypes.includes(t)) f[descriptions[t]] = extensions[t]
      return f
    }, {}),
    saveLabel: 'Export',
    title: 'Export slide deck',
  })

  if (saveURI) {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `Exporting Marp slide deck to ${saveURI.toString()}...`,
      },
      () => doExport(saveURI, document)
    )
  }
}

export default async function exportCommand() {
  if (!workspace.isTrusted) {
    const acted = await window.showErrorMessage(
      'Export command cannot run in untrusted workspace.',
      ITEM_MANAGE_WORKSPACE_TRUST
    )

    if (acted === ITEM_MANAGE_WORKSPACE_TRUST) {
      commands.executeCommand('workbench.trust.manage').then(
        () => {
          // do nothing
        },
        (e) => {
          console.error(e)

          // Try alternative way (for VS Code 1.57)
          // TODO: Remove executing alternative command if the extension requires VS Code 1.58+
          commands.executeCommand('workbench.action.manageTrust')
        }
      )
    }

    return
  }

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
