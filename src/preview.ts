import browser from '@marp-team/marp-core/browser'

export default function preview() {
  const marpVscode = document.getElementById('marp-vscode')

  if (marpVscode) {
    document.body.classList.add('marp-vscode')

    // Remove default styles
    const styles = document.querySelectorAll(
      'style:not(#marp-vscode-style):not(#_defaultStyles)'
    )
    const links = document.querySelectorAll(
      'link[rel="stylesheet"]:not([href*="marp-vscode"])'
    )
    styles.forEach(elm => elm.remove())
    links.forEach(elm => elm.remove())

    // Run Marp observer
    browser()
  }
}
