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
        removeDefaultStyles()
        marpObserverCleanup = observer()
      } else {
        restoreDefaultStyles()
        marpObserverCleanup?.()
        marpObserverCleanup = undefined
      }

      marpState = newMarpState
    }
  }

  window.addEventListener('vscode.markdown.updateContent', updateCallback)

  // Initial update
  updateCallback()
}

const removeDefaultStyles = () => {
  const styles = document.querySelectorAll<HTMLStyleElement>(
    'style:not(#marp-vscode-style):not(#_defaultStyles)'
  )
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"]:not([href*="marp-vscode"])'
  )

  styles.forEach((elm) => {
    elm.dataset.marpVscodeBody = elm.innerText
    elm.innerText = ''
  })

  links.forEach((elm) => {
    const { href } = elm
    elm.dataset.marpVscodeHref = href
    elm.removeAttribute('href')
  })
}

const restoreDefaultStyles = () => {
  const styles = document.querySelectorAll<HTMLStyleElement>(
    'style[data-marp-vscode-body]'
  )
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[data-marp-vscode-href]'
  )

  styles.forEach((elm) => {
    elm.innerText = elm.dataset.marpVscodeBody || ''
    delete elm.dataset.marpVscodeBody
  })

  links.forEach((elm) => {
    elm.href = elm.dataset.marpVscodeHref || ''
    delete elm.dataset.marpVscodeHref
  })
}
