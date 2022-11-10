import style from './Guide.module.css'
import { registerVSCodeButton, registerVSCodeLink } from './vscode'

registerVSCodeButton()
registerVSCodeLink()

export const Guide = () => {
  return (
    <div className={style.guide}>
      <p>
        Marp for VS Code supports writing your beautiful presentation with
        Markdown.
      </p>
      <div className={style.guideBtnContainer}>
        <vscode-button onClick={console.log}>New Marp Markdown</vscode-button>
      </div>
      <div className={style.guideBtnContainer}>
        <vscode-button onClick={console.log}>
          Enable Marp feature for current Markdown
        </vscode-button>
      </div>
      <p>
        See the documentation of{' '}
        <vscode-link
          href="https://marpit.marp.app/markdown"
          target="_blank"
          rel="noopener noreferrer"
        >
          Marpit Markdown (base framework)
        </vscode-link>{' '}
        and{' '}
        <vscode-link
          href="https://github.com/marp-team/marp-core#features"
          target="_blank"
          rel="noopener noreferrer"
        >
          additional features of Marp Core
        </vscode-link>{' '}
        about how to write.
      </p>
    </div>
  )
}
