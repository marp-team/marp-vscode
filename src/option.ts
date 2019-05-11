import { Options } from 'markdown-it'
import { TextDocument, workspace } from 'vscode'
import { MarpOptions } from '@marp-team/marp-core'

let cachedPreviewOption: MarpOptions | undefined
let cachedCLIOption: any

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
    const zoom =
      workspace.getConfiguration('window').get<number>('zoomLevel') || 0

    cachedPreviewOption = {
      container: { tag: 'div', id: 'marp-vscode', 'data-zoom': 1.2 ** zoom },
      html: marpConfiguration().get<boolean>('enableHtml') || undefined,
      markdown: { breaks: breaks(!!baseOption.breaks) },
    }
  }
  return cachedPreviewOption
}

export const marpCoreOptionForCLI = (target: TextDocument): any => {
  if (!cachedCLIOption) {
    cachedCLIOption = {
      allowLocalFiles: true,
      html: marpConfiguration().get<boolean>('enableHtml') || undefined,
      options: {
        markdown: {
          breaks: breaks(
            !!workspace
              .getConfiguration('markdown.preview', target.uri)
              .get<boolean>('breaks')
          ),
        },
      },
    }
  }
  return cachedCLIOption
}

export const clearMarpCoreOptionCache = () => {
  cachedPreviewOption = undefined
  cachedCLIOption = undefined
}
