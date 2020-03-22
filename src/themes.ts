import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import axios from 'axios'
import { Disposable, RelativePattern, Uri, commands, workspace } from 'vscode'
import { marpConfiguration } from './utils'

export enum ThemeType {
  File = 'File',
  Remote = 'Remote',
}

export interface Theme {
  readonly css: string
  readonly onDidChange?: Disposable
  readonly onDidDelete?: Disposable
  readonly path: string
  readonly registered?: boolean
  readonly type: ThemeType
}

// TODO: Consider using VS Code's `workspace.fs` API in future.
// https://github.com/microsoft/vscode/issues/48034
const readFile = promisify(fs.readFile)

const isRemotePath = (path: string) =>
  path.startsWith('https:') || path.startsWith('http:')

export class Themes {
  observedThemes = new Map<string, Theme>()

  dispose() {
    this.observedThemes.forEach((theme) => {
      if (theme.onDidChange) theme.onDidChange.dispose()
      if (theme.onDidDelete) theme.onDidDelete.dispose()
    })
    this.observedThemes.clear()
  }

  getRegisteredStyles(rootDirectory: Uri | undefined): Theme[] {
    return this.getPathsFromConf(rootDirectory)
      .map((p) => this.observedThemes.get(p))
      .filter((t) => t) as Theme[]
  }

  loadStyles(rootDirectory: Uri | undefined): Promise<Theme>[] {
    return this.getPathsFromConf(rootDirectory).map((p) =>
      this.registerTheme(p)
    )
  }

  private getPathsFromConf(rootDirectory: Uri | undefined): string[] {
    const themes = marpConfiguration().get<string[]>('themes')

    if (Array.isArray(themes) && themes.length > 0) {
      return this.normalizePaths(themes, rootDirectory)
    }

    return []
  }

  private normalizePaths(
    paths: string[],
    rootDirectory: Uri | undefined
  ): string[] {
    const normalizedPaths = new Set<string>()

    for (const p of paths) {
      if (typeof p !== 'string') continue

      if (isRemotePath(p)) {
        normalizedPaths.add(p)
      } else if (rootDirectory) {
        const resolvedPath = path.resolve(rootDirectory.fsPath, p)

        if (
          !path.relative(rootDirectory.fsPath, resolvedPath).startsWith('..')
        ) {
          normalizedPaths.add(resolvedPath)
        }
      }
    }

    return [...normalizedPaths.values()]
  }

  private async registerTheme(themePath: string): Promise<Theme> {
    const theme = this.observedThemes.get(themePath)
    if (theme) return theme

    console.log('Fetching theme CSS:', themePath)

    const type: ThemeType = isRemotePath(themePath)
      ? ThemeType.Remote
      : ThemeType.File

    const css = await (async (): Promise<string> => {
      switch (type) {
        case ThemeType.File:
          return (await readFile(themePath)).toString()
        case ThemeType.Remote:
          return (await axios.get(themePath, { timeout: 5000 })).data
      }
    })()

    const registeredTheme: Theme = { css, type, path: themePath }

    if (type === ThemeType.File) {
      const fsWatcher = workspace.createFileSystemWatcher(
        new RelativePattern(path.dirname(themePath), path.basename(themePath))
      )

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
