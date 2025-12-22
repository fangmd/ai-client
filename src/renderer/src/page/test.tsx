import { Button } from '@renderer/components/ui/button'
import { useState } from 'react'
import type { IPCResponse } from '@/preload/types'
import { SUCCESS_CODE, IPC_CHANNELS } from '@/common/constants/ipc'

export const Test: React.FC = () => {
  const [message, setMessage] = useState<string>('')

  const handlePing = () => {
    console.log('ping')
    // 发送 ping 请求
    window.electron.ipcRenderer.send(IPC_CHANNELS.test.ping)

    // 监听 pong 响应
    const unsubscribe = window.electron.ipcRenderer.on(
      IPC_CHANNELS.test.pong,
      (_event, response: IPCResponse<{ message: string }>) => {
        if (response.code === SUCCESS_CODE && response.data) {
          setMessage(response.data.message)
          console.log('Received:', response.data.message)
        } else {
          console.error('Error:', response.msg)
          setMessage('Error: ' + response.msg)
        }
        unsubscribe()
      }
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test</h1>
      <Button onClick={handlePing}>ping 请求</Button>
      {message && <p className="mt-4 text-gray-600">Response: {message}</p>}
    </div>
  )
}
