import { effect, signal } from '@preact/signals'
import type { SlideViewState } from '../../slides/index'
import { vscodeApi } from '../common/vscode'

// Preact signals
const vscode = vscodeApi<SlideViewState>()

export const state = signal(vscode.getState())
effect(() => vscode.setState(state.value))

// Recieve message from VS Code
type MessageDefinitions = {
  updateState: Partial<SlideViewState>
}

type Message<T extends keyof MessageDefinitions = keyof MessageDefinitions> =
  T extends never ? never : { type: T; opts: MessageDefinitions[T] }

const isMessage = (obj: unknown): obj is Message =>
  typeof obj === 'object' && !!obj && 'type' in obj && 'opts' in obj

window.addEventListener('message', ({ data }) => {
  if (isMessage(data)) {
    switch (data.type) {
      case 'updateState':
        state.value = { ...state.value, ...data.opts }
        break
    }
  }
})
