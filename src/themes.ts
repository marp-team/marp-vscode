import fs from 'fs'
import path from 'path'
import { URL } from 'url'
import { promisify, TextDecoder } from 'util'
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
import { fetch, marpConfiguration } from './utils'

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

const readFile = promisify(fs.readFile)

const isRemotePath = (path: string) =>
  path.startsWith('https:') || path.startsWith('http:')

const isVirtualPath = (path: string) => /^[a-z0-9.+-]+:\/\/\b/.test(path)

const textDecoder = new TextDecoder()

export class Themes {
  observedThemes = new Map<string, Theme>()

  static resolveBaseDirectoryForTheme(doc: TextDocument): Uri {
    const workspaceFolder = workspace.getWorkspaceFolder(doc.uri)
    if (workspaceFolder) return workspaceFolder.uri

    return doc.uri.with({ path: path.dirname(doc.fileName) })
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
      Themes.resolveBaseDirectoryForTheme(doc)
    )) {
      try {
        marp.themeSet.add(css)
      } catch (e) {
        // no ops
      }
    }

    return marp.themeSet
  }

  getRegisteredStyles(rootUri: Uri | undefined): Theme[] {
    return this.getPathsFromConf(rootUri)
      .map((p) => this.observedThemes.get(p))
      .filter((t) => t) as Theme[]
  }

  loadStyles(rootUri: Uri | undefined): Promise<Theme>[] {
    return this.getPathsFromConf(rootUri).map((p) => this.registerTheme(p))
  }

  private getPathsFromConf(rootUri: Uri | undefined): string[] {
    const themes = marpConfiguration().get<string[]>('themes')

    if (Array.isArray(themes) && themes.length > 0) {
      return this.normalizePaths(themes, rootUri)
    }

    return []
  }

  private normalizePaths(paths: string[], rootUri: Uri | undefined): string[] {
    const normalizedPaths = new Set<string>()

    for (const p of paths) {
      if (typeof p !== 'string') continue

      if (isRemotePath(p)) {
        normalizedPaths.add(p)
      } else if (rootUri) {
        if (rootUri.scheme === 'file') {
          const resolvedPath = path.resolve(rootUri.fsPath, p)

          if (!path.relative(rootUri.fsPath, resolvedPath).startsWith('..')) {
            normalizedPaths.add(resolvedPath)
          }
        } else {
          try {
            const { pathname: relativePath } = new URL(p, 'dummy://dummy/')

            normalizedPaths.add(
              rootUri.with({ path: rootUri.path + relativePath }).toString()
            )
          } catch (e) {
            // no ops
          }
        }
      }
    }

    return [...normalizedPaths.values()]
  }

  private async registerTheme(themePath: string): Promise<Theme> {
    const theme = this.observedThemes.get(themePath)
    if (theme) return theme

    console.log('Fetching theme CSS:', themePath)

    const type: ThemeType = (() => {
      if (isRemotePath(themePath)) return ThemeType.Remote
      if (isVirtualPath(themePath)) return ThemeType.VirtualFS

      return ThemeType.File
    })()

    const css = await (async (): Promise<string> => {
      switch (type) {
        case ThemeType.File:
          return (await readFile(themePath)).toString()
        case ThemeType.Remote:
          return await fetch(themePath, { timeout: 5000 })
        case ThemeType.VirtualFS:
          return textDecoder.decode(
            await workspace.fs.readFile(Uri.parse(themePath, true))
          )
      }
    })()

    const registeredTheme: Theme = { css, type, path: themePath }

    const watcherPattern: GlobPattern | undefined = (() => {
      switch (type) {
        case ThemeType.File:
          return new RelativePattern(
            path.dirname(themePath),
            path.basename(themePath)
          )
        case ThemeType.VirtualFS:
          try {
            const baseUri = Uri.parse(themePath, true)
            const { pathname } = new URL('.', themePath)

            return new RelativePattern(
              baseUri.with({ path: pathname }),
              baseUri.path.split('/').pop()! // eslint-disable-line @typescript-eslint/no-non-null-assertion
            )
          } catch (e) {
            // no ops
          }
      }

      return undefined
    })()

    if (watcherPattern) {
      const fsWatcher = workspace.createFileSystemWatcher(watcherPattern)

      const onDidChange = fsWatcher.onDidChange(async () => {
        onDidChange.dispose()
        this.observedThemes.delete(themePath)

        await this.registerTheme(themePath)
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
