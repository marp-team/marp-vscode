import { state } from '../state'
import { Guide } from './Guide'
import { MarpSlidePage } from './MarpSlidePage'

export interface AppProps {}

export const App = ({}: AppProps) => {
  if (!state.value?.enabled) return <Guide />

  return (
    <>
      {state.value?.marp?.html.map((_, i) => (
        <MarpSlidePage key={i} index={i} />
      ))}
    </>
  )
}
