import { effect, signal } from '@preact/signals'
import type { SlideViewState } from '../../slides/index'
import { isMessage } from '../common/message'
import { vscodeApi } from '../common/vscode'

// Preact signals
const vscode = vscodeApi<SlideViewState>()

export const state = signal(vscode.getState())
effect(() => vscode.setState(state.value))

// Recieve message from VS Code
type SlidesMessageDefinitions = {
  updateState: Partial<SlideViewState>
}

window.addEventListener('message', ({ data }) => {
  if (isMessage<SlidesMessageDefinitions>(data)) {
    switch (data.type) {
      case 'updateState':
        state.value = { ...state.value, ...data.opts }
        break
    }
  }
})
