import { observer } from '@marp-team/marp-core/browser'
import lodashDebounce from 'lodash.debounce'

const stabilizerThrottleDelay = 150

const onDOMContentLoaded = (callback: () => void) => {
  const { readyState } = document

  if (readyState === 'complete' || readyState === 'interactive') {
    callback()
  } else {
    window.addEventListener('DOMContentLoaded', callback)
  }
}

export default function preview() {
  const marpVscode = document.getElementById('marp-vscode')

  if (marpVscode) {
    const { documentId } = marpVscode.dataset

    document.body.classList.add('marp-vscode')

    // Remove default styles
    const styles = document.querySelectorAll(
      'style:not(#marp-vscode-style):not(#_defaultStyles)'
    )
    const links = document.querySelectorAll(
      'link[rel="stylesheet"]:not([href*="marp-vscode"])'
    )
    styles.forEach((elm) => elm.remove())
    links.forEach((elm) => elm.remove())

    // Run Marp observer
    observer()

    if (documentId) {
      // Scroll stabilizer
      //
      // WARN: It works as a fallback logic for VS Code built-in preview
      // stabilizer and not always apply the updated scroll position.
      // Specifically this logic will apply only when executed Marp's preview
      // script after VS Code's built-in preview script. VS Code uses
      // `<script async>` to inject external preview scripts so all preview
      // scripts execute with an unpredictable order.

      const count = marpVscode.querySelectorAll(
        ':scope > svg[data-marpit-svg]'
      ).length

      const trySettingToStorage = (key: string, value: string) => {
        try {
          sessionStorage.setItem(`marp-vscode-${documentId}-${key}`, value)
        } catch (_) {
          // no ops
        }
      }

      const tryGettingFromStorage = (key: string) => {
        try {
          return sessionStorage.getItem(`marp-vscode-${documentId}-${key}`)
        } catch (_) {
          return null
        }
      }

      const setScrollY = lodashDebounce(
        () => trySettingToStorage('scrollY', window.scrollY.toString()),
        stabilizerThrottleDelay,
        { leading: true, maxWait: stabilizerThrottleDelay, trailing: true }
      )

      const storedScrollY = tryGettingFromStorage('scrollY')

      if (storedScrollY) {
        const storedCount = tryGettingFromStorage('count')

        // Apply when the number of pages did not change from before editing
        if (storedCount && Number.parseInt(storedCount) === count) {
          window.scrollTo({ top: Number.parseFloat(storedScrollY) })
        }
      }

      // Set current position and the number of pages
      trySettingToStorage('count', count.toString())

      onDOMContentLoaded(() => setTimeout(setScrollY, 16))
      window.addEventListener('scroll', setScrollY)
    }
  }
}
