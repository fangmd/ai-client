import { useEffect, useRef, useState } from 'react'
import axios from '@/common/request'
import {
  getMessages,
  getSession,
  removeMessages,
  removeSession,
  saveMessages,
  saveSession
} from '@/common/utils'
import type { Message } from '@/types/chat'

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

// Generate unique ID for messages
export const generateMessageId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export const useBailian = ({
  apiURL,
  apiKey,
  onReceive
}: {
  apiURL: string
  apiKey: string
  onReceive: (msg: Message | null) => void
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [lastSysMsg, setLastSysMsg] = useState<Message | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const sessionIdRef = useRef('')

  useEffect(() => {
    console.log('useBailian messages', messages)
  }, [messages])

  const addMessage = (message: Message) => {
    setIsFromCache(false)
    setMessages((preMessages) => {
      const newMessages = [...preMessages, message]
      saveMessages(newMessages)
      return newMessages
    })
  }

  const sendMessage = async (message: string, hideMsg = false, ignoreLastSysMsg = false) => {
    console.log('sendMessage', status)
    if (!hideMsg) {
      addMessage({ id: generateMessageId(), role: 'user', content: message, timestamp: Date.now() })
    }
    setStatus('submitted')

    try {
      const response = (await axios.post(
        apiURL,
        {
          input: {
            prompt: message,
            session_id: sessionIdRef.current
          },
          parameters: {},
          debug: {}
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 19 * 1000
        }
      )) as any
      console.log('useBailian response', response)
      console.log('lastSysMsg', lastSysMsg)

      if (response?.output?.session_id && !sessionIdRef.current) {
        sessionIdRef.current = response.output.session_id
        saveSession(sessionIdRef.current)
      }

      if (response?.output?.text) {
        // TODO： 检查 text json 是否合法
        try {
          if (lastSysMsg && !ignoreLastSysMsg) {
            const lastSysMsgObj = JSON.parse(lastSysMsg.content)
            const newLastSysMsgObj = JSON.parse(response.output.text)

            const newMsg: Message = {
              id: generateMessageId(),
              role: 'assistant',
              content: JSON.stringify({
                ...newLastSysMsgObj,
                diffHealth: newLastSysMsgObj.health - lastSysMsgObj.health,
                showDiffHealthAnimation: true,
                diffFloor: newLastSysMsgObj.floor - lastSysMsgObj.floor
              }),
              timestamp: Date.now()
            }

            setLastSysMsg(newMsg)
            addMessage(newMsg)
            onReceive(newMsg)

            setTimeout(() => {
              setMessages((oldMessages) => {
                const newMessages = oldMessages.map((msg) => {
                  if (msg.id === newMsg.id) {
                    msg.content = JSON.stringify({
                      ...JSON.parse(msg.content),
                      showDiffHealthAnimation: false
                    })
                    return msg
                  }
                  return msg
                })
                saveMessages(newMessages)

                return newMessages
              })
            }, 2000)
          } else {
            const newMsg: Message = {
              id: generateMessageId(),
              role: 'assistant',
              content: response.output.text,
              timestamp: Date.now()
            }
            setLastSysMsg(newMsg)
            addMessage(newMsg)
            onReceive(newMsg)
          }
        } catch (error) {
          console.error('useBailian lastSysMsg parse error', error)
          onReceive(null)
        }
      }
      setStatus('ready')
    } catch (error) {
      console.error('useBailian net error', error)
      setStatus('error')
      onReceive(null)
    }
  }

  /** 初始化游戏 */
  const sendDefaultMessage = (ignoreLastSysMsg = false) => {
    sendMessage('介绍下游戏玩法', true, ignoreLastSysMsg)
  }

  useEffect(() => {
    const sessionId = getSession()
    if (sessionId) {
      sessionIdRef.current = sessionId
    }

    const messages = getMessages()
    if (messages.length > 0) {
      setIsFromCache(true) // 标记这是从缓存获取的消息
      setMessages(messages)
      const lastSysMsg = messages.filter((msg) => msg.role === 'assistant').pop()
      console.log('init lastSysMsg', lastSysMsg)
      if (lastSysMsg) {
        setLastSysMsg(lastSysMsg)
      }
    } else {
      setLastSysMsg(null)
      sendDefaultMessage()
    }
  }, [])

  const resetChat = () => {
    sessionIdRef.current = ''
    removeSession()
    removeMessages()
    setMessages([])
    setLastSysMsg(null)
    setStatus('ready')
    setIsFromCache(false) // 重置缓存标识

    sendDefaultMessage(true)
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
