export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

// Generate unique ID for messages
export const generateMessageId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
