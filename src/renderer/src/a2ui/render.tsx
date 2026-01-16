import { A2UIProvider, ThemeProvider, Surface, MessageProcessor, useA2UIContext } from '@a2ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Types } from '@a2ui/lit/0.8'
import { logDebug, logError, logInfo } from '@renderer/utils'

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
  // 跟踪已处理的消息数量，实现增量流式渲染
  const processedCountRef = useRef(0)
  // 跟踪上次处理的消息数组长度，用于检测重置
  const lastMessagesLengthRef = useRef(0)
  // 跟踪是否是第一次处理（需要清空 surfaces）
  const isFirstProcessRef = useRef(true)
  const [cnt, setCnt] = useState(1)

  useEffect(() => {
    const unsubscribe = processor.subscribe(async (event) => {
      logInfo('[A2UI] action received', event)
      //
    })

    return unsubscribe
  }, [processor])

  useEffect(() => {
    // 检测消息数组是否被重置（长度减少），如果是则重置状态
    if (messages.length < lastMessagesLengthRef.current) {
      logDebug('[A2UI] messages array reset detected, resetting processor state')
      processor.clearSurfaces()
      processedCountRef.current = 0
      isFirstProcessRef.current = true
    }
    lastMessagesLengthRef.current = messages.length

    logInfo('[A2UI] processing messages', {
      total: messages.length,
      processed: processedCountRef.current,
      new: messages.length - processedCountRef.current,
      messages: messages
    })

    // 如果是第一次处理，清空 surfaces（确保干净的状态）
    if (isFirstProcessRef.current && messages.length > 0) {
      processor.clearSurfaces()
      isFirstProcessRef.current = false
    }

    // 只处理新增的消息（流式渲染的关键）
    if (messages.length > processedCountRef.current) {
      const newMessages = messages.slice(processedCountRef.current)
      try {
        logDebug('[A2UI] processing new messages', newMessages)
        processor.processMessages(newMessages)
        processedCountRef.current = messages.length
        setCnt((pre) => {
          return pre + 1
        })
      } catch (e) {
        logError('[A2UI] renderer Failed to process messages', { e, newMessages })
      }
    }
    // 注意：这里不依赖 processor，因为 processor 是 useMemo 创建的，不会变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  return (
    <A2UIProvider processor={processor}>
      <div>a2ui</div>
      <SurfaceRenderer />
    </A2UIProvider>
  )
}
