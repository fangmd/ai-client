export const SP_SESSION_KEY = 'sessionId'

export const SP_MESSAGES_KEY = 'messages'

/**
 * 保存会话 ID
 * @param sessionId 会话 ID
 */
export const saveSession = (sessionId: string) => {
  localStorage.setItem(SP_SESSION_KEY, sessionId)
}

/**
 * 获取会话 ID
 * @returns 会话 ID
 */
export const getSession = () => {
  return localStorage.getItem(SP_SESSION_KEY)
}

/**
 * 删除会话 ID
 */
export const removeSession = () => {
  localStorage.removeItem(SP_SESSION_KEY)
}

/**
 * 保存消息
 * @param messages 消息
 */
export const saveMessages = (messages: any[]) => {
  localStorage.setItem(SP_MESSAGES_KEY, JSON.stringify(messages))
}

/**
 * 获取消息
 * @returns 消息
 */
export const getMessages = () => {
  return JSON.parse(localStorage.getItem(SP_MESSAGES_KEY) || '[]')
}

/**
 * 删除消息
 */
export const removeMessages = () => {
  localStorage.removeItem(SP_MESSAGES_KEY)
}
