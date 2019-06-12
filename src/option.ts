import { Options } from 'markdown-it'
import { coerce, lt } from 'semver'
import { TextDocument, version, workspace } from 'vscode'
import { MarpOptions } from '@marp-team/marp-core'

let cachedPreviewOption: MarpOptions | undefined
let cachedCLIOption: any

// WebKit polyfill requires in VS Code < 1.36 (Electron 3).
//
// NOTE: Electron 3 has got a stable rendering by applying WebKit polyfill. And
// Electron 4 has almost stable rendering even if polyfill is not used but still
// remains glitch when used CSS 3D transform and video component. Electron 5
// also has a glitch in video, and we have to wait for stable rendering until
// Electron 6.
const coercedVer = coerce(version)
const isRequiredPolyfill = coercedVer ? lt(coercedVer, '1.36.0') : false

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
      container: {
        tag: 'div',
        id: 'marp-vscode',
        'data-zoom': 1.2 ** zoom,
        ...(isRequiredPolyfill ? { 'data-polyfill': 'true' } : {}),
      },
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
