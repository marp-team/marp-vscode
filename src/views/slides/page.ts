import html from 'dedent'
import { customAlphabet } from 'nanoid'
import slidesScript from '@view-scripts/slides'

const nanoid = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  32
)

export interface PageOptions {}

export const page = ({}: PageOptions = {}) => {
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
      <body>
        <div id="root"></div>
        <script nonce="${scriptNonce}">
          ${slidesScript}
        </script>
      </body>
    </html>
  `
}

export default page
