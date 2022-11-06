import { state } from '../state'

export interface AppProps {}

export const App = ({}: AppProps) => {
  return (
    <>
      <h1>Slides</h1>
      <p>Enabled: {state.value?.enabled ? 'Enabled' : 'Disabled'}</p>
    </>
  )
}
