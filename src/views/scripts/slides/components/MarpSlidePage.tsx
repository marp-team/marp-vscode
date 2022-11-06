import { browser } from '@marp-team/marp-core/browser'
import { useComputed } from '@preact/signals'
import { useRef, useLayoutEffect } from 'preact/hooks'
import { state } from '../state'

export interface MarpSlidePageProps {
  index: number
}

export const MarpSlidePage = ({ index }: MarpSlidePageProps) => {
  const elmRef = useRef<HTMLDivElement>(null)

  const marp = useComputed(() => state.value?.marp)
  const slide = marp.value?.html[index]

  useLayoutEffect(() => {
    if (!elmRef.current || !slide) return
    if (!elmRef.current.shadowRoot) {
      elmRef.current.attachShadow({ mode: 'open' })
    }

    const root = elmRef.current.shadowRoot!
    root.innerHTML = `<style>${marp.value.css}</style><style>:host>[data-marpit-svg]{display:block;}</style>${slide}`

    return browser(root)
  }, [slide])

  if (!slide) return null

  const inert: any = { inert: true }
  return (
    <div
      ref={elmRef}
      role="image"
      style="border:5px solid red;"
      {...inert}
    ></div>
  )
}
