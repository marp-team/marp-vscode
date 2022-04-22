import { tmpdir } from 'os'
import path from 'path'
import { MarpOptions } from '@marp-team/marp-core'
import { Options } from 'markdown-it'
import { nanoid } from 'nanoid'
import { TextDocument, Uri, workspace } from 'vscode'
import themes, { ThemeType } from './themes'
import {
  marpConfiguration,
  mathTypesettingConfiguration,
  unlink,
  writeFile,
} from './utils'

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

const math = () => {
  const conf = mathTypesettingConfiguration()
  return conf === 'off' ? false : conf
}

export const marpCoreOptionForPreview = (
  baseOption: Options & MarpOptions
): MarpOptions => {
  if (!cachedPreviewOption) {
    cachedPreviewOption = {
      container: { tag: 'div', id: '__marp-vscode' },
      slideContainer: { tag: 'div', 'data-marp-vscode-slide-wrapper': '' },
      html: enableHtml() || undefined,
      inlineSVG: {
        backdropSelector: false,
      },
      markdown: {
        breaks: breaks(!!baseOption.breaks),
        typographer: baseOption.typographer,
      },
      math: math(),
      minifyCSS: false,
      script: false,
    }
  }
  return cachedPreviewOption
}

export const marpCoreOptionForCLI = async (
  { uri }: TextDocument,
  {
    allowLocalFiles = true,
    pdfNotes,
  }: { allowLocalFiles?: boolean; pdfNotes?: boolean } = {}
) => {
  const confMdPreview = workspace.getConfiguration('markdown.preview', uri)

  const baseOpts = {
    allowLocalFiles,
    pdfNotes,
    html: enableHtml() || undefined,
    options: {
      markdown: {
        breaks: breaks(!!confMdPreview.get<boolean>('breaks')),
        typographer: confMdPreview.get<boolean>('typographer'),
      },
      math: math(),
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
              const tmpUri = Uri.file(tmp)

              await writeFile(tmpUri, theme.css)
              return { path: tmp, cleanup: () => unlink(tmpUri) }
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
