import { existsSync } from 'node:fs'
import {
  Browser,
  BrowserPlatform,
  ChromeReleaseChannel,
  computeSystemExecutablePath,
} from '@puppeteer/browsers'

/**
 * Detect a usable Chromium-based browser executable.
 *
 * Uses `@puppeteer/browsers` computeSystemExecutablePath to locate installed
 * browsers in the standard system locations.
 *
 * @param preference - User-configured browser preference ('auto' | 'chrome' | 'edge')
 * @param explicitPath - An explicit path to a browser binary (overrides detection)
 */
export function detectBrowserPath(
  preference = 'auto',
  explicitPath?: string,
): string | undefined {
  if (explicitPath && existsSync(explicitPath)) return explicitPath

  const platform = detectPlatform()
  if (!platform) return undefined

  const candidates: { browser: Browser; channel: ChromeReleaseChannel }[] = []

  if (preference === 'chrome' || preference === 'auto') {
    candidates.push({
      browser: Browser.CHROME,
      channel: ChromeReleaseChannel.STABLE,
    })
  }

  if (preference === 'edge' || preference === 'auto') {
    // @puppeteer/browsers does not have a direct Edge enum;
    // On Windows/Mac, Edge is detectable via known paths.
    // For now, prioritise Chrome detection.
  }

  for (const { browser, channel } of candidates) {
    try {
      const executablePath = computeSystemExecutablePath({
        browser,
        platform,
        channel,
      })
      if (existsSync(executablePath)) return executablePath
    } catch {
      // Not found — try next candidate
    }
  }

  return undefined
}

function detectPlatform(): BrowserPlatform | undefined {
  switch (process.platform) {
    case 'win32':
      return process.arch === 'x64'
        ? BrowserPlatform.WIN64
        : BrowserPlatform.WIN32
    case 'darwin':
      return BrowserPlatform.MAC
    case 'linux':
      return BrowserPlatform.LINUX
    default:
      return undefined
  }
}
