import html from 'dedent'
import { customAlphabet } from 'nanoid'
import css from './page.css'

const nanoid = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  32
)

export interface PageOptions {
  scriptPath: string
}

console.log(css)

export const page = ({ scriptPath }: PageOptions) => {
  const scriptNonce = nanoid()

  return html`
    <!DOCTYPE html>
    <html>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        http-equiv="Content-Security-Policy"
        content="script-src 'nonce-${scriptNonce}';"
      />
      <style>
        ${css}
      </style>
      <body>
        <div id="root"></div>
        <script nonce="${scriptNonce}" src="${scriptPath}"></script>
      </body>
    </html>
  `
}

export default page
