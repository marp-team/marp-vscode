import Marp from '@marp-team/marp-core'
import {
  commands,
  workspace,
  Disposable,
  GlobPattern,
  RelativePattern,
  TextDocument,
  Uri,
} from 'vscode'
import { fetch, marpConfiguration, readFile } from './utils'

export enum ThemeType {
  File = 'File',
  Remote = 'Remote',
  VirtualFS = 'VirtualFS',
}

export interface Theme {
  readonly css: string
  readonly onDidChange?: Disposable
  readonly onDidDelete?: Disposable
  readonly path: string
  readonly registered?: boolean
  readonly type: ThemeType
}

export interface SizePreset {
  height: string
  name: string
  width: string
}

const isRemotePath = (path: string | Uri) => {
  if (typeof path === 'string') {
    return path.startsWith('https:') || path.startsWith('http:')
  }
  return path.scheme === 'https' || path.scheme === 'http'
}

export class Themes {
  observedThemes = new Map<string, Theme>()

  static resolveBaseDirectoryForTheme(doc: TextDocument): Uri {
    const workspaceFolder = workspace.getWorkspaceFolder(doc.uri)
    if (workspaceFolder) return workspaceFolder.uri

    return Uri.joinPath(doc.uri, '..')
  }

  dispose() {
    this.observedThemes.forEach((theme) => {
      if (theme.onDidChange) theme.onDidChange.dispose()
      if (theme.onDidDelete) theme.onDidDelete.dispose()
    })
    this.observedThemes.clear()
  }

  getMarpThemeSetFor(doc: TextDocument) {
    const marp = new Marp()

    for (const { css } of this.getRegisteredStyles(
      Themes.resolveBaseDirectoryForTheme(doc),
    )) {
      try {
        marp.themeSet.add(css)
      } catch {
        // no ops
      }
    }

    return marp.themeSet
  }

  getRegisteredStyles(rootUri: Uri | undefined): Theme[] {
    return this.getPathsFromConf(rootUri)
      .map((uri) => this.observedThemes.get(uri.toString()))
      .filter((t): t is Theme => !!t)
  }

  getSizePresets(
    doc: TextDocument,
    themeName: string | undefined,
  ): SizePreset[] {
    const themeSet = this.getMarpThemeSetFor(doc)
    const theme = themeSet.get(themeName ?? '', true)?.name || 'default'

    const sizeMeta = (themeSet.getThemeMeta(theme, 'size') as string[]) || []
    const sizes = new Map<string, SizePreset>()

    for (const size of sizeMeta) {
      const args = size.split(/\s+/)

      if (args.length === 3) {
        sizes.set(args[0], {
          name: args[0],
          width: args[1],
          height: args[2],
        })
      } else if (args.length === 2 && args[1] === 'false') {
        sizes.delete(args[0])
      }
    }

    return [...sizes.values()]
  }

  loadStyles(rootUri: Uri | undefined): Promise<Theme>[] {
    return this.getPathsFromConf(rootUri).map((uri) => this.registerTheme(uri))
  }

  private getPathsFromConf(rootUri: Uri | undefined): Uri[] {
    const themes = marpConfiguration().get<string[]>('themes')

    if (Array.isArray(themes) && themes.length > 0) {
      return this.normalizePaths(themes, rootUri)
    }

    return []
  }

  private normalizePaths(paths: string[], rootUri: Uri | undefined): Uri[] {
    const normalizedPaths = new Set<Uri>()

    for (const p of paths) {
      if (typeof p !== 'string') continue

      if (isRemotePath(p)) {
        normalizedPaths.add(Uri.parse(p, true))
      } else if (rootUri) {
        const targetUri = Uri.joinPath(rootUri, p)

        // Prevent directory traversal
        if (targetUri.path.startsWith(rootUri.path)) {
          normalizedPaths.add(targetUri)
        }
      }
    }

    const out: Uri[] = []
    const outStringPaths: string[] = []

    for (const uri of normalizedPaths) {
      const uriString = uri.toString()

      if (!outStringPaths.includes(uriString)) {
        out.push(uri)
        outStringPaths.push(uriString)
      }
    }

    return out
  }

  private async registerTheme(themeUri: Uri): Promise<Theme> {
    const themePath = themeUri.toString()
    const theme = this.observedThemes.get(themePath)
    if (theme) return theme

    console.log('Fetching theme CSS:', themePath)

    const type: ThemeType = (() => {
      if (themeUri.scheme === 'file') return ThemeType.File
      if (isRemotePath(themeUri)) return ThemeType.Remote

      return ThemeType.VirtualFS
    })()

    const css = await (async (): Promise<string> => {
      switch (type) {
        case ThemeType.Remote:
          return await fetch(themePath, { timeout: 5000 })
        default:
          return await readFile(themeUri)
      }
    })()

    const registeredTheme: Theme = {
      css,
      type,
      path: type === ThemeType.File ? themeUri.fsPath : themePath,
    }

    const watcherPattern: GlobPattern | undefined =
      type !== ThemeType.Remote
        ? new RelativePattern(
            Uri.joinPath(themeUri, '..'),
            themeUri.path.split('/').pop()!,
          )
        : undefined

    if (watcherPattern) {
      const fsWatcher = workspace.createFileSystemWatcher(watcherPattern)

      const onDidChange = fsWatcher.onDidChange(async () => {
        onDidChange.dispose()
        this.observedThemes.delete(themePath)

        await this.registerTheme(themeUri)
        commands.executeCommand('markdown.preview.refresh')
      })

      const onDidDelete = fsWatcher.onDidDelete(() => {
        onDidDelete.dispose()
        this.observedThemes.delete(themePath)
      })

      Object.assign(registeredTheme, { onDidChange, onDidDelete })
    }

    this.observedThemes.set(themePath, registeredTheme)

    return { ...registeredTheme, registered: true }
  }
}

export default new Themes()
