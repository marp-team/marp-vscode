import { tmpdir } from 'os'
import path from 'path'
import { MarpOptions } from '@marp-team/marp-core'
import { Options } from 'markdown-it'
import { nanoid } from 'nanoid'
import {
  ConfigurationScope,
  Disposable,
  TextDocument,
  Uri,
  workspace,
} from 'vscode'
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
let cachedSlidesViewOption: MarpOptions | undefined

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

const pdfOutlines = () => {
  switch (marpConfiguration().get<string>('pdf.outlines')) {
    case 'pages':
      return { pages: true, headings: false }
    case 'headings':
      return { pages: false, headings: true }
    case 'both':
      return { pages: true, headings: true }
    default:
      return false
  }
}

const generateMarpCoreOptionBase = (
  configurationScope?: ConfigurationScope
) => {
  const confMdPreview = workspace.getConfiguration(
    'markdown.preview',
    configurationScope
  )

  return {
    html: enableHtml() || undefined,
    inlineSVG: { backdropSelector: false },
    markdown: {
      breaks: breaks(!!confMdPreview.get<boolean>('breaks')),
      typographer: confMdPreview.get<boolean>('typographer'),
    },
    math: math(),
    script: false,
  } as const
}

export const marpCoreOptionForPreview = (
  baseOption: Options & MarpOptions
): MarpOptions => {
  if (!cachedPreviewOption) {
    cachedPreviewOption = {
      ...generateMarpCoreOptionBase(),
      container: { tag: 'div', id: '__marp-vscode' },
      slideContainer: { tag: 'div', 'data-marp-vscode-slide-wrapper': '' },
      markdown: {
        breaks: breaks(!!baseOption.breaks),
        typographer: baseOption.typographer,
      },
      minifyCSS: false,
    }
  }
  return cachedPreviewOption
}

export const marpCoreOptionsForSlidesView = (): MarpOptions => {
  if (!cachedSlidesViewOption) {
    cachedSlidesViewOption = {
      ...generateMarpCoreOptionBase(),
      container: false,
    }
  }
  return cachedSlidesViewOption
}

export const marpCoreOptionForCLI = async (
  { uri }: TextDocument,
  {
    allowLocalFiles = true,
    pdfNotes,
  }: { allowLocalFiles?: boolean; pdfNotes?: boolean } = {}
) => {
  const coreOpts = generateMarpCoreOptionBase(uri)

  const baseOpts = {
    allowLocalFiles,
    pdfNotes,
    pdfOutlines: pdfOutlines(),
    html: coreOpts.html,
    options: {
      markdown: coreOpts.markdown,
      math: coreOpts.math,
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
  cachedSlidesViewOption = undefined
}

const shouldRefreshConfs = [
  'markdown.marp.breaks',
  'markdown.marp.enableHtml',
  'markdown.marp.mathTypesetting',
  'markdown.marp.outlineExtension',
  'markdown.marp.themes',
  'markdown.preview.breaks',
  'markdown.preview.typographer',
]

const shouldRefreshListeners = new Set<() => void>([clearMarpCoreOptionCache])

export const registerConfigurationTracker = (subscriptions: Disposable[]) => {
  subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (shouldRefreshConfs.some((c) => e.affectsConfiguration(c))) {
        for (const listener of shouldRefreshListeners.values()) listener()
      }
    })
  )
}

export const onChangeDependingConfiguration = (
  listener: () => void
): Disposable => {
  shouldRefreshListeners.add(listener)
  return { dispose: () => void shouldRefreshListeners.delete(listener) }
}
