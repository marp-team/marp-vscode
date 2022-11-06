import { state } from '../state'
import { MarpSlidePage } from './MarpSlidePage'

export interface AppProps {}

export const App = ({}: AppProps) => {
  if (!state.value?.enabled) {
    return <p>Open Marp document!</p>
  }

  return (
    <>
      {state.value?.marp?.html.map((_, i) => (
        <MarpSlidePage key={i} index={i} />
      ))}
    </>
  )
}
