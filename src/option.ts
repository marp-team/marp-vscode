import { unlink, writeFile } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { Options } from 'markdown-it'
import nanoid from 'nanoid'
import { coerce, lt } from 'semver'
import { TextDocument, Uri, version, workspace } from 'vscode'
import { MarpOptions } from '@marp-team/marp-core'
import themes, { ThemeType } from './themes'

export interface WorkFile {
  path: string
  cleanup: () => Promise<void>
}

let cachedPreviewOption: MarpOptions | undefined

const coercedVer = coerce(version)

// WebKit polyfill requires in VS Code < 1.36 (Electron 3).
//
// NOTE: Electron 3 has got a stable rendering by applying WebKit polyfill. And
// Electron 4 has almost stable rendering even if polyfill is not used but still
// remains glitch when used CSS 3D transform and video component. Electron 5
// also has a glitch in video, and we have to wait for stable rendering until
// Electron 6.
export const isRequiredPolyfill = coercedVer ? lt(coercedVer, '1.36.0') : false

export const marpConfiguration = () =>
  workspace.getConfiguration('markdown.marp')

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

export const marpCoreOptionForPreview = (
  baseOption: Options & MarpOptions
): MarpOptions => {
  if (!cachedPreviewOption) {
    const containerBaseArgs = (() => {
      if (!isRequiredPolyfill) return {}

      const zoom =
        workspace.getConfiguration('window').get<number>('zoomLevel') || 0

      return { 'data-polyfill': 'true', 'data-zoom': 1.2 ** zoom }
    })()

    cachedPreviewOption = {
      container: { ...containerBaseArgs, tag: 'div', id: 'marp-vscode' },
      html: marpConfiguration().get<boolean>('enableHtml') || undefined,
      markdown: { breaks: breaks(!!baseOption.breaks) },
    }
  }
  return cachedPreviewOption
}

export const marpCoreOptionForCLI = async ({ uri }: TextDocument) => {
  const baseOpts = {
    allowLocalFiles: true,
    html: marpConfiguration().get<boolean>('enableHtml') || undefined,
    options: {
      markdown: {
        breaks: breaks(
          !!workspace
            .getConfiguration('markdown.preview', uri)
            .get<boolean>('breaks')
        ),
      },
    },
    themeSet: [] as string[],
    vscode: {} as Record<string, any>,
  }

  const workspaceFolder = workspace.getWorkspaceFolder(uri)
  const parentFolder = uri.scheme === 'file' && path.dirname(uri.fsPath)
  const baseFolder = workspaceFolder ? workspaceFolder.uri.fsPath : parentFolder

  if (baseFolder) {
    const themeFiles: WorkFile[] = ((await Promise.all(
      themes.loadStyles(Uri.parse(`file:${baseFolder}`)).map(promise =>
        promise
          .then(async theme => {
            if (theme.type === ThemeType.File) {
              return { path: theme.path, cleanup: () => Promise.resolve() }
            }

            if (theme.type === ThemeType.Remote) {
              const cssName = `.marp-vscode-cli-theme-${nanoid()}.css`
              const tmp = path.join(tmpdir(), cssName)

              await promisify(writeFile)(tmp, theme.css)
              return { path: tmp, cleanup: () => promisify(unlink)(tmp) }
            }
          })
          .catch(e => console.error(e))
      )
    )) as any).filter(w => w)

    baseOpts.themeSet = themeFiles.map(w => w.path)
    baseOpts.vscode.themeFiles = themeFiles
  }

  return baseOpts
}

export const clearMarpCoreOptionCache = () => {
  cachedPreviewOption = undefined
}
