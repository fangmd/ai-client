import { A2UIProvider, ThemeProvider, Surface, MessageProcessor, useA2UIContext } from '@a2ui/react'
import { useEffect, useMemo, useState } from 'react'
import { Types } from '@a2ui/lit/0.8'
import { logDebug, logInfo } from '@renderer/utils'

/**
 * Component that renders all active surfaces.
 * Must be inside A2UIProvider to access surfaces context.
 */
export function SurfaceRenderer() {
  const { surfaces } = useA2UIContext()
  logInfo('[A2UI] surfaces', surfaces)
  const surfaceIds = Array.from(surfaces.keys())

  if (surfaceIds.length === 0) {
    return null
  }

  return (
    <section className="surfaces">
      {surfaceIds.map((surfaceId) => (
        <Surface key={surfaceId} surfaceId={surfaceId} />
      ))}
    </section>
  )
}

export function A2UI({ messages }: { messages: Types.ServerToClientMessage[] }) {
  const processor = useMemo(() => new MessageProcessor(), [])
  const [cnt, setCnt] = useState(1)

  useEffect(() => {
    const unsubscribe = processor.subscribe(async (event) => {
      logInfo('[A2UI] action received', event)
      // 
    })

    return unsubscribe
  }, [processor])

  useEffect(() => {
    logInfo('[A2UI] processing messages', messages)
    processor.clearSurfaces()
    processor.processMessages(messages)
    setTimeout(() => {
      setCnt((pre) => {
        return pre + 1
      })
    }, 100)
  }, [messages])

  return (
    <A2UIProvider processor={processor}>
      <div>a2ui</div>
      <SurfaceRenderer />
    </A2UIProvider>
  )
}
