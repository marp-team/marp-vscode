import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Config } from '@marp-team/marp-cli'
import { MarpOptions } from '@marp-team/marp-core'
import { Options } from 'markdown-it'
import { nanoid } from 'nanoid'
import { TextDocument, Uri, window, workspace } from 'vscode'
import openExtensionSettings from './commands/open-extension-settings'
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

export interface ConfigForCLI extends Config {
  vscode: {
    themeFiles: WorkFile[]
  }
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

const html = () => {
  if (workspace.isTrusted) {
    const htmlConf = marpConfiguration().get<string>('html')

    if (htmlConf === 'all') return { value: true }
    if (htmlConf === 'off') return { value: false }

    // Legacy configuration compatibility
    const legacyConf = marpConfiguration().get<boolean>('enableHtml')
    if (legacyConf) return { value: true, legacy: true }

    return { value: undefined }
  } else {
    return { value: false }
  }
}

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

export const marpCoreOptionForPreview = (
  baseOption: Options & MarpOptions,
): MarpOptions => {
  if (!cachedPreviewOption) {
    const htmlOption = html()

    if (htmlOption.legacy) {
      // Show warning for legacy configuration
      window
        .showWarningMessage(
          'The setting "markdown.marp.enableHtml" is deprecated. Please use "markdown.marp.html" instead. Please review your settings JSON to make silence this warning.',
          'Open Extension Settings',
        )
        .then((selected) => {
          if (selected) void openExtensionSettings()
        })
    }

    cachedPreviewOption = {
      container: { tag: 'div', id: '__marp-vscode' },
      slideContainer: { tag: 'div', 'data-marp-vscode-slide-wrapper': '' },
      html: htmlOption.value,
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
    pptxEditable: _pptxEditable,
  }: {
    allowLocalFiles?: boolean
    pdfNotes?: boolean
    pptxEditable?: boolean
  } = {},
) => {
  const confMdPreview = workspace.getConfiguration('markdown.preview', uri)

  const pptxEditable = (() => {
    if (_pptxEditable !== undefined) return _pptxEditable

    const v = marpConfiguration().get<'off' | 'on' | 'smart'>('pptx.editable')
    if (v === 'on') return true
    if (v === 'off') return false

    return undefined
  })()

  let browser = marpConfiguration().get<'auto' | 'chrome' | 'edge' | 'firefox'>(
    'browser',
  )

  const browserPath = (() => {
    const browserPath = marpConfiguration().get<string>('browserPath')
    if (browserPath) {
      // If `markdown.marp.browserPath` is `auto`, detect the kind of browser by the binary name
      if (browser === 'auto') {
        try {
          const binaryName = path.basename(browserPath).toLowerCase()

          if (binaryName.includes('firefox') || binaryName.includes('fx'))
            browser = 'firefox'
        } catch (e) {
          console.error(e)
          console.warn(
            'Failed to detect the kind of browser by the binary name.',
          )
        }
      }

      return browserPath
    }

    // Legacy compatibility
    const chromePath = marpConfiguration().get<string>('chromePath')
    if (chromePath) {
      // Show warning for legacy configuration
      window
        .showWarningMessage(
          'The setting "markdown.marp.chromePath" is deprecated. Please use "markdown.marp.browserPath" instead. Please review your settings JSON to make silence this warning.',
          'Open Extension Settings',
        )
        .then((selected) => {
          if (selected) void openExtensionSettings()
        })

      // Force to use Chrome if `markdown.marp.chromePath` is set
      browser = 'chrome'

      return chromePath
    }

    return undefined
  })()

  const baseOpts = {
    allowLocalFiles,
    pdfNotes,
    pdfOutlines: pdfOutlines(),
    html: html().value,
    browser: browser || 'auto',
    browserPath,
    options: {
      markdown: {
        breaks: breaks(!!confMdPreview.get<boolean>('breaks')),
        typographer: confMdPreview.get<boolean>('typographer'),
      },
      math: math(),
    },
    pptxEditable,
    themeSet: [] as string[],
  } satisfies Config as ConfigForCLI

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
          (e) => console.error(e),
        ),
      ),
    )
  ).filter((w): w is WorkFile => !!w)

  baseOpts.themeSet = themeFiles.map((w) => w.path)
  baseOpts.vscode = { themeFiles }

  return baseOpts
}

export const clearMarpCoreOptionCache = () => {
  cachedPreviewOption = undefined
}
