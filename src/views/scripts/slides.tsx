export default 'Script for slides view'

import { render } from 'preact'
import { App } from './slides/components/App'

const root = document.getElementById('root')

if (root) render(<App />, root)
