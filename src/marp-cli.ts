import marpCli from '@marp-team/marp-cli'
import fs from 'fs'
import nanoid from 'nanoid'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { TextDocument, workspace } from 'vscode'
import { marpCoreOptionForCLI } from './option'

const unlink = promisify(fs.unlink)
const writeFile = promisify(fs.writeFile)

interface WorkFile {
  path: string
  cleanup: () => Promise<void>
}

export class MarpCLIError extends Error {}

export async function createWorkFile(doc: TextDocument): Promise<WorkFile> {
  // Use a real file if posibble
  if (doc.uri.scheme === 'file' && !doc.isDirty) {
    return { path: doc.uri.fsPath, cleanup: () => Promise.resolve() }
  }

  const text = doc.getText()
  const tmpFileName = `.marp-vscode-tmp-${nanoid()}`
  const createCleanup = (target: string) => () => unlink(target)

  // Try to create tmp file to the same directory as a document
  const sameDirTmpPath = path.join(path.dirname(doc.uri.fsPath), tmpFileName)

  try {
    await writeFile(sameDirTmpPath, text)
    return { path: sameDirTmpPath, cleanup: createCleanup(sameDirTmpPath) }
  } catch (e) {}

  // If it fails, try to create to the root of workspace
  const documentWorkspace = workspace.getWorkspaceFolder(doc.uri)

  if (documentWorkspace && documentWorkspace.uri.scheme === 'file') {
    const workspaceDir = documentWorkspace.uri.fsPath
    const workspaceDirTmpPath = path.join(workspaceDir, tmpFileName)

    try {
      await writeFile(workspaceDirTmpPath, text)
      return {
        path: workspaceDirTmpPath,
        cleanup: createCleanup(workspaceDirTmpPath),
      }
    } catch (e) {}
  }

  // If it fails, create to OS specific tmp directory
  const tmpPath = path.join(tmpdir(), tmpFileName)

  await writeFile(tmpPath, text)
  return { path: tmpPath, cleanup: createCleanup(tmpPath) }
}

export async function createConfigFile(
  target: TextDocument
): Promise<WorkFile> {
  const tmpFileName = `.marp-vscode-cli-conf-${nanoid()}.json`
  const tmpPath = path.join(tmpdir(), tmpFileName)

  await writeFile(tmpPath, JSON.stringify(marpCoreOptionForCLI(target)))
  return { path: tmpPath, cleanup: () => unlink(tmpPath) }
}

export default async function runMarpCli(...opts: string[]): Promise<void> {
  const argv = ['--no-stdin', ...opts]
  console.info(`Execute Marp CLI: ${argv.join(' ')}`)

  // Track error log to show better feedback
  const errors: object[] = []
  const { error } = console

  console.error = (...args) => {
    errors.push(...args)
    return error(...args)
  }

  try {
    const exitCode = await marpCli(argv)

    if (exitCode !== 0) {
      for (const err of errors) {
        if (err.toString().includes('Chromium revision is not downloaded.')) {
          throw new MarpCLIError(
            'It requires to install Google Chrome or Chromium for exporting.'
          )
        }
      }
      throw new MarpCLIError(
        `Marp CLI throwed unexpected error with exit code ${exitCode}.`
      )
    }
  } finally {
    console.error = error
  }
}
