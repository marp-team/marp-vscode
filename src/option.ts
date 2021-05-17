import { unlink, writeFile } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { MarpOptions } from '@marp-team/marp-core'
import { Options } from 'markdown-it'
import { nanoid } from 'nanoid'
import { TextDocument, Uri, workspace } from 'vscode'
import themes, { ThemeType } from './themes'
import { marpConfiguration } from './utils'

export interface WorkFile {
  path: string
  cleanup: () => Promise<void>
}

let cachedPreviewOption: MarpOptions | undefined

const breaks = (inheritedValue: boolean): boolean => {
  switch (marpConfiguration().get<string>('breaks')) {
    case 'off':
      return false
    case 'inherit':
      return inheritedValue
    default:
      return true
  }
}

const enableHtml = () =>
  marpConfiguration().get<boolean>('enableHtml') && workspace.isTrusted

export const marpCoreOptionForPreview = (
  baseOption: Options & MarpOptions
): MarpOptions => {
  if (!cachedPreviewOption) {
    cachedPreviewOption = {
      container: { tag: 'div', id: 'marp-vscode' },
      html: enableHtml() || undefined,
      markdown: {
        breaks: breaks(!!baseOption.breaks),
        typographer: baseOption.typographer,
      },
      math: marpConfiguration().get<'katex' | 'mathjax'>('mathTypesetting'),
      minifyCSS: false,
      script: false,
    }
  }
  return cachedPreviewOption
}

export const marpCoreOptionForCLI = async (
  { uri }: TextDocument,
  { allowLocalFiles = true }: { allowLocalFiles?: boolean } = {}
) => {
  const confMdPreview = workspace.getConfiguration('markdown.preview', uri)

  const baseOpts = {
    allowLocalFiles,
    html: enableHtml() || undefined,
    options: {
      markdown: {
        breaks: breaks(!!confMdPreview.get<boolean>('breaks')),
        typographer: confMdPreview.get<boolean>('typographer'),
      },
      math: marpConfiguration().get<'katex' | 'mathjax'>('mathTypesetting'),
    },
    themeSet: [] as string[],
    vscode: {} as Record<string, any>,
  }

  const workspaceFolder = workspace.getWorkspaceFolder(uri)
  const parentFolder = uri.scheme === 'file' && path.dirname(uri.fsPath)

  const baseFolder = (() => {
    if (workspaceFolder) return workspaceFolder.uri
    if (parentFolder) return Uri.parse(`file:${parentFolder}`, true)

    return undefined
  })()

  const themeFiles: WorkFile[] = (
    await Promise.all(
      themes.loadStyles(baseFolder).map((promise) =>
        promise.then(
          async (theme) => {
            if (theme.type === ThemeType.File) {
              return { path: theme.path, cleanup: () => Promise.resolve() }
            }

            if (
              theme.type === ThemeType.Remote ||
              theme.type === ThemeType.VirtualFS
            ) {
              const cssName = `.marp-vscode-cli-theme-${nanoid()}.css`
              const tmp = path.join(tmpdir(), cssName)

              await promisify(writeFile)(tmp, theme.css)
              return { path: tmp, cleanup: () => promisify(unlink)(tmp) }
            }
          },
          (e) => console.error(e)
        )
      )
    )
  ).filter((w): w is WorkFile => !!w)

  baseOpts.themeSet = themeFiles.map((w) => w.path)
  baseOpts.vscode.themeFiles = themeFiles

  return baseOpts
}

export const clearMarpCoreOptionCache = () => {
  cachedPreviewOption = undefined
}
