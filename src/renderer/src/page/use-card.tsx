import { useEffect, useRef, useState } from 'react'
import { generateMessageId, type ChatStatus } from '@renderer/hooks/use-bailian'
import { Message } from '@/types/chat'

export const useCard = ({
  apiURL,
  apiKey,
  onReceive
}: {
  apiURL: string
  apiKey: string
  onReceive?: (msg: Message | null) => void
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [lastSysMsg, setLastSysMsg] = useState<Message | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const sessionIdRef = useRef('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    console.log('useCard messages', messages)
  }, [messages])

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const sendMessage = async (message: string, hideMsg = false) => {
    console.log('sendMessage', status)

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    if (!hideMsg) {
      setMessages((preMessages) => {
        const newMsg: Message = {
          id: generateMessageId(),
          role: 'user',
          content: message,
          timestamp: Date.now()
        }
        const newMessages = [...preMessages, newMsg]
        console.log('send', JSON.stringify(newMessages))

        return newMessages
      })
    }
    setStatus('submitted')

    try {
      const data = {
        input: {
          prompt: message,
          session_id: sessionIdRef.current
        },
        parameters: {
          incremental_output: 'true', // 增量输出
          has_thoughts: 'true'
        },
        debug: {}
      }
      const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable' // 流式输出
        },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal // 添加取消信号
      })
      const reader = response.body?.getReader()

      const newMsg: Message = {
        id: `${generateMessageId()}-2`,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      }
      let jsonText = ''
      while (true) {
        // 检查是否已被取消
        if (abortControllerRef.current?.signal.aborted) {
          console.log('Request was cancelled during streaming')
          break
        }

        const { done, value } = await reader!.read()
        if (done) break
        const text = new TextDecoder().decode(value) // 二进制转文字
        // console.log('text', text)

        /** 
         * id:18
          event:result
          :HTTP_STATUS/200
          data:{"output":{"session_id":"e1400737a397478e843887e07b4550ab","finish_reason":"null","text":"通关,每一关不超过"},"usage":{"models":[{"input_tokens":4097,"output_tokens":74,"model_id":"qwen-plus"}]},"request_id":"9defb3cf-5c29-4feb-a8a4-bea1de419d01"}
         */
        // 处理 text

        const lines = (jsonText + text).split('\n')
        lines.forEach((line) => {
          if (line.startsWith('data:')) {
            try {
              // console.log('line', line.substring(5))
              const jsonData = JSON.parse(line.substring(5))
              if (jsonData.output && jsonData.output.text) {
                newMsg.content += jsonData.output.text
              }
              jsonText = ''

              // if (jsonData.output.finish_reason === 'stop' && jsonData.output.text) {
              //   newMsg.content = jsonData.output.text
              // }
            } catch (e) {
              jsonText += text
              console.warn('useCard data parse error', e)
            }
          }
        })

        console.log('newMsg.content', newMsg.content)
        if (newMsg) {
          setLastSysMsg(newMsg)
          setMessages((preMessages) => {
            if (preMessages[preMessages.length - 1].id === newMsg.id) {
              // 创建新的数组和对象，保持不可变性
              const updatedMessages = [...preMessages]
              updatedMessages[updatedMessages.length - 1] = {
                ...updatedMessages[updatedMessages.length - 1],
                content: newMsg.content,
                timestamp: newMsg.timestamp
              }

              // console.log('send pre', JSON.stringify(updatedMessages))
              return updatedMessages
            }
            // console.log('send add', JSON.stringify(preMessages))
            return [...preMessages, { ...newMsg, timestamp: Date.now() }]
          })

          onReceive?.(newMsg)
        }
      }

      if (response.status === 200) {
      }
      setStatus('ready')
    } catch (error) {
      // 检查是否是取消错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled')
        setStatus('ready')
        return
      }

      console.error('useCard net error', error)
      setStatus('error')
      onReceive?.(null)
    }
  }

  const resetChat = () => {
    // 取消网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    sessionIdRef.current = ''
    setMessages([])
    setLastSysMsg(null)
    setStatus('ready')
    setIsFromCache(false) // 重置缓存标识
  }

  return {
    messages,
    sendMessage,
    status,
    resetChat,
    lastSysMsg,
    isFromCache
  }
}
