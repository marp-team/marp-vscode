import { tmpdir } from 'node:os'
import path from 'node:path'
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
import { marpConfiguration, unlink, hasToString } from '../utils'
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

const browsers = {
  chrome: '[Google Chrome](https://www.google.com/chrome/)',
  chromium: '[Chromium](https://www.chromium.org/)',
  edge: '[Microsoft Edge](https://www.microsoft.com/edge)',
  firefox: '[Mozilla Firefox](https://www.mozilla.org/firefox/)',
} as const

export const ITEM_CONTINUE_TO_EXPORT = 'Continue to export...'
export const ITEM_MANAGE_WORKSPACE_TRUST = 'Manage Workspace Trust...'

export const command = 'markdown.marp.export' // Legacy, mapped to 'markdown.marp.exportAs' in '../extension.ts'
export const commandAs = 'markdown.marp.exportAs'
export const commandQuick = 'markdown.marp.exportQuick'
export const commandToSelectedFormat = 'markdown.marp.exportToSelectedFormat'

export const allCommands = [
  command,
  commandAs,
  commandQuick,
  commandToSelectedFormat,
] as string[]

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
      if (document.uri.scheme === 'untitled') return false
      if (document.uri.scheme === 'file') {
        if (
          marpConfiguration().get<boolean>('strictPathResolutionDuringExport')
        )
          return true

        // VS Code's Markdown preview may show local resources placed at the
        // outside of workspace, and using the proxy server in that case may too
        // much prevent file accesses.
        //
        // So leave handling local files to Marp CLI if the current document was
        // assumed to use local file system.
        return false
      }

      return true
    }

    return false
  })()

  if (shouldProvideWorkspaceProxyServer) {
    const workspaceFolder = workspace.getWorkspaceFolder(document.uri)

    if (workspaceFolder) {
      proxyServer = await createWorkspaceProxyServer(workspaceFolder)

      let baseUrlPath = document.uri.path
      if (baseUrlPath.startsWith(workspaceFolder.uri.path)) {
        baseUrlPath = baseUrlPath.slice(workspaceFolder.uri.path.length)
      }
      if (!baseUrlPath.startsWith('/')) {
        baseUrlPath = `/${baseUrlPath}`
      }

      baseUrl = `http://127.0.0.1:${proxyServer.port}${baseUrlPath}`

      console.debug(
        `Proxy server for the workspace ${workspaceFolder.name} has created (port: ${proxyServer.port} / baseUrl: ${baseUrl})`,
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
          `marp-vscode-tmp-${nanoid()}${ouputExt}`,
        )
      }

      const pptxEditableSmart =
        ouputExt === '.pptx' &&
        marpConfiguration().get<string>('pptx.editable') === 'smart'

      const runMarpCli = async ({
        pptxEditable,
      }: {
        pptxEditable?: boolean
      }) => {
        const conf = await createConfigFile(document, {
          allowLocalFiles: !proxyServer,
          pdfNotes:
            ouputExt === '.pdf' &&
            marpConfiguration().get<boolean>('pdf.noteAnnotations'),
          pptxEditable,
        })

        try {
          await marpCli(
            ['-c', conf.path, input.path, '-o', outputPath],
            { baseUrl },
            {
              onCLIError: ({ error, codes }) => {
                switch (error.errorCode) {
                  case codes.NOT_FOUND_BROWSER: {
                    // Throw error with user-friendly instructions based on the current configuration
                    const suggestBrowsers: string[] = []

                    switch (marpConfiguration().get<string>('browser')) {
                      case 'chrome':
                        suggestBrowsers.push(
                          ...[
                            browsers.chrome,
                            process.platform === 'linux'
                              ? browsers.chromium
                              : '',
                          ].filter((b) => !!b),
                        )
                        break
                      case 'edge':
                        suggestBrowsers.push(browsers.edge)
                        break
                      case 'firefox':
                        suggestBrowsers.push(browsers.firefox)
                        break
                      default:
                        suggestBrowsers.push(
                          ...[
                            browsers.chrome,
                            process.platform === 'linux'
                              ? browsers.chromium
                              : '',
                            browsers.edge,
                            browsers.firefox,
                          ].filter((b) => !!b),
                        )
                    }

                    throw new MarpCLIError(
                      `It requires to install a suitable browser, ${suggestBrowsers
                        .join(', ')
                        .replace(/, ([^,]*)$/, ' or $1')} for exporting.`,
                    )
                  }
                  case codes.NOT_FOUND_SOFFICE:
                    throw new MarpCLIError(
                      'It requires to install LibreOffice Impress for exporting to the editable PowerPoint document.',
                    )
                }
              },
            },
          )
        } catch (e) {
          if (pptxEditableSmart && pptxEditable === true) {
            return await runMarpCli({ pptxEditable: false })
          }
          throw e
        } finally {
          conf.cleanup()
        }

        const shouldOpen = marpConfiguration().get<boolean>('exportAutoOpen')

        if (outputToLocalFS && shouldOpen) {
          env.openExternal(uri)
        } else {
          const outputUri = Uri.file(outputPath)

          try {
            await workspace.fs.copy(outputUri, uri, { overwrite: true })
          } finally {
            try {
              await unlink(outputUri)
            } catch {
              // no ops
            }
          }

          window.showInformationMessage(
            `Marp slide deck was successfully exported to ${uri.toString()}.`,
          )
        }
      }

      await runMarpCli({ pptxEditable: pptxEditableSmart ? true : undefined })
    } catch (e) {
      window.showErrorMessage(
        `Failure to export${(() => {
          if (e instanceof MarpCLIError) return `. ${e.message}`
          if (e instanceof Error) return `: [${e.name}] ${e.message}`
          if (hasToString(e)) return `. ${e.toString()}`

          return ' by unknown error.'
        })()}`,
      )
    } finally {
      input.cleanup()
    }
  } finally {
    proxyServer?.dispose()
  }
}

export const startExport = async (uri: Uri, document: TextDocument) => {
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Exporting Marp slide deck to ${uri.toString()}...`,
    },
    () => doExport(uri, document),
  )
}

export const saveDialog = async (document: TextDocument) => {
  const { fsPath } = document.uri

  const defaultType = marpConfiguration().get<string>('exportType')!
  const ext = extensions[defaultType] ? `.${extensions[defaultType][0]}` : ''
  const baseTypes = Object.keys(extensions)
  const types = [...new Set<string>([defaultType, ...baseTypes])]

  const saveURI = await window.showSaveDialog({
    defaultUri: Uri.file(
      (document.isUntitled
        ? 'untitled'
        : fsPath.slice(0, -path.extname(fsPath).length)) + ext,
    ),
    filters: types.reduce((f, t) => {
      if (baseTypes.includes(t)) f[descriptions[t]] = extensions[t]
      return f
    }, {}),
    saveLabel: 'Export',
    title: 'Export slide deck',
  })

  if (saveURI) {
    startExport(saveURI, document)
  }
}

export function saveUri(document: TextDocument, extension: string) {
  const { fsPath } = document.uri

  const basePath = document.isUntitled
    ? path.join(process.cwd(), 'untitled')
    : fsPath.slice(0, -path.extname(fsPath).length)

  const outputPath = `${basePath}.${extension}`

  return Uri.file(outputPath)
}

export async function checkWorkspaceTrust() {
  if (!workspace.isTrusted) {
    const acted = await window.showErrorMessage(
      'Export command cannot run in untrusted workspace.',
      ITEM_MANAGE_WORKSPACE_TRUST,
    )

    if (acted === ITEM_MANAGE_WORKSPACE_TRUST) {
      commands.executeCommand('workbench.trust.manage')
    }
    return false
  }
  return true
}

export async function validateMarkdownDocument(document: TextDocument) {
  if (document.languageId !== 'markdown') {
    const acted = await window.showWarningMessage(
      'A current document is not Markdown document.',
      ITEM_CONTINUE_TO_EXPORT,
    )
    return acted === ITEM_CONTINUE_TO_EXPORT
  }
  return true
}

export async function exportCommandAs() {
  const isTrusted = await checkWorkspaceTrust()
  if (!isTrusted) return

  const activeEditor = window.activeTextEditor
  if (!activeEditor) return

  const isMarkdownOrContinue = await validateMarkdownDocument(
    activeEditor.document,
  )
  if (!isMarkdownOrContinue) return

  await saveDialog(activeEditor.document)
}

export async function exportCommandQuick() {
  const isTrusted = await checkWorkspaceTrust()
  if (!isTrusted) return

  const activeEditor = window.activeTextEditor
  if (!activeEditor) return

  const isMarkdownOrContinue = await validateMarkdownDocument(
    activeEditor.document,
  )
  if (!isMarkdownOrContinue) return

  const exportType = marpConfiguration().get<string>('exportType')!
  const ext = extensions[exportType]
  const saveURI = saveUri(activeEditor.document, ext)

  if (saveURI) {
    startExport(saveURI, activeEditor.document)
  }
}

export async function exportCommandToSelectedFormat() {
  const isTrusted = await checkWorkspaceTrust()
  if (!isTrusted) return

  const activeEditor = window.activeTextEditor
  if (!activeEditor) return

  const isMarkdownOrContinue = await validateMarkdownDocument(
    activeEditor.document,
  )
  if (!isMarkdownOrContinue) return

  const items = Object.keys(extensions).map((type) => ({
    label: descriptions[type],
    description: type,
  }))

  const selected = await window.showQuickPick(items, {
    placeHolder: 'Select export format',
  })
  if (!selected) return

  const saveURI = saveUri(
    activeEditor.document,
    extensions[selected.description][0],
  )

  if (saveURI) {
    startExport(saveURI, activeEditor.document)
  }
}
