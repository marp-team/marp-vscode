import { tmpdir } from 'os'
import path from 'path'
import type { marpCli } from '@marp-team/marp-cli'
import { nanoid } from 'nanoid'
import { TextDocument, Uri, workspace } from 'vscode'
import { WorkFile, marpCoreOptionForCLI } from './option'
import { marpConfiguration, writeFile, unlink } from './utils'

const createCleanup = (target: Uri) => async () => {
  await unlink(target)
}

export class MarpCLIError extends Error {}

export async function createWorkFile(doc: TextDocument): Promise<WorkFile> {
  // Use a real file if posibble
  if (doc.uri.scheme === 'file' && !doc.isDirty) {
    return { path: doc.uri.fsPath, cleanup: () => Promise.resolve() }
  }

  const text = doc.getText()
  const tmpFileName = `.marp-vscode-tmp-${nanoid()}`

  // Try to create tmp file to the same directory as a document
  if (doc.uri.scheme === 'file') {
    const sameDirTmpPath = path.join(path.dirname(doc.uri.fsPath), tmpFileName)
    const tmpUri = Uri.file(sameDirTmpPath)

    try {
      await writeFile(tmpUri, text)
      return { path: sameDirTmpPath, cleanup: createCleanup(tmpUri) }
    } catch {
      // no ops
    }
  }

  // If it fails, try to create to the root of workspace
  const documentWorkspace = workspace.getWorkspaceFolder(doc.uri)

  if (documentWorkspace?.uri.scheme === 'file') {
    const workspaceDir = documentWorkspace.uri.fsPath
    const workspaceDirTmpPath = path.join(workspaceDir, tmpFileName)
    const tmpUri = Uri.file(workspaceDirTmpPath)

    try {
      await writeFile(tmpUri, text)
      return { path: workspaceDirTmpPath, cleanup: createCleanup(tmpUri) }
    } catch {
      // no ops
    }
  }

  // If it fails, create to OS specific tmp directory
  const tmpPath = path.join(tmpdir(), tmpFileName)
  const tmpUri = Uri.file(tmpPath)

  await writeFile(tmpUri, text)
  return { path: tmpPath, cleanup: createCleanup(tmpUri) }
}

export async function createConfigFile(
  target: TextDocument,
  opts?: Parameters<typeof marpCoreOptionForCLI>[1],
): Promise<WorkFile> {
  const tmpFileName = `.marp-vscode-cli-conf-${nanoid()}.json`
  const tmpPath = path.join(tmpdir(), tmpFileName)
  const tmpUri = Uri.file(tmpPath)

  const cliOpts = await marpCoreOptionForCLI(target, opts)
  await writeFile(tmpUri, JSON.stringify(cliOpts))

  return {
    path: tmpPath,
    cleanup: async () => {
      await Promise.all([
        unlink(tmpUri),
        ...cliOpts.vscode.themeFiles.map((w: WorkFile) => w.cleanup()),
      ])
    },
  }
}

export default async function runMarpCli(
  ...[argv, opts]: Parameters<typeof marpCli>
): Promise<void> {
  console.info(`Execute Marp CLI [${argv.join(' ')}] (${JSON.stringify(opts)})`)

  const { marpCli, CLIError, CLIErrorCode } = await import(
    '@marp-team/marp-cli'
  )
  const { CHROME_PATH } = process.env

  let exitCode: number

  try {
    process.env.CHROME_PATH =
      marpConfiguration().get<string>('chromePath') || CHROME_PATH

    exitCode = await marpCli(argv, opts)
  } catch (e) {
    console.error(e)

    if (
      e instanceof CLIError &&
      e.errorCode === CLIErrorCode.NOT_FOUND_CHROMIUM
    ) {
      const browsers = ['[Google Chrome](https://www.google.com/chrome/)']

      if (process.platform === 'linux')
        browsers.push('[Chromium](https://www.chromium.org/)')

      browsers.push('[Microsoft Edge](https://www.microsoft.com/edge)')

      throw new MarpCLIError(
        `It requires to install ${browsers
          .join(', ')
          .replace(/, ([^,]*)$/, ' or $1')} for exporting.`,
      )
    }

    throw e
  } finally {
    process.env.CHROME_PATH = CHROME_PATH
  }

  if (exitCode !== 0) {
    throw new MarpCLIError(
      `Marp CLI throwed unexpected error with exit code ${exitCode}.`,
    )
  }
}
