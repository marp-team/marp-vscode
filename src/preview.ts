import { observer } from '@marp-team/marp-core/browser'

export default function preview() {
  let marpState: boolean | undefined
  let marpObserverCleanup: (() => void) | undefined

  // Detect update of DOM
  const updateCallback = () => {
    const marpVscode = document.getElementById('marp-vscode')
    const newMarpState = !!marpVscode

    if (marpState !== newMarpState) {
      document.body.classList.toggle('marp-vscode', newMarpState)

      if (newMarpState) {
        marpObserverCleanup = observer()
      } else {
        marpObserverCleanup?.()
        marpObserverCleanup = undefined
      }

      marpState = newMarpState
    }

    if (marpState) {
      removeStyles()
    } else {
      restoreStyles()
    }
  }

  window.addEventListener('vscode.markdown.updateContent', updateCallback)

  // Initial update
  updateCallback()
}

const removeStyles = () => {
  const styles = document.querySelectorAll<HTMLStyleElement>(
    'style:not(#marp-vscode-style):not(#_defaultStyles):not([data-marp-vscode-body])'
  )
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"][href]:not([href*="marp-vscode"])'
  )

  styles.forEach((elm) => {
    if (elm.closest('#marp-vscode')) return
    elm.dataset.marpVscodeBody = elm.textContent ?? ''
    elm.textContent = ''
  })

  links.forEach((elm) => {
    if (elm.closest('#marp-vscode')) return
    const { href } = elm
    elm.dataset.marpVscodeHref = href
    elm.removeAttribute('href')
  })
}

const restoreStyles = () => {
  const styles = document.querySelectorAll<HTMLStyleElement>(
    'style[data-marp-vscode-body]'
  )
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[data-marp-vscode-href]'
  )

  styles.forEach((elm) => {
    elm.textContent = elm.dataset.marpVscodeBody || ''
    delete elm.dataset.marpVscodeBody
  })

  links.forEach((elm) => {
    elm.href = elm.dataset.marpVscodeHref || ''
    delete elm.dataset.marpVscodeHref
  })
}
