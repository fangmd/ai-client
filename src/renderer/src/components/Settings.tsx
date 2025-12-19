import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { useChatStore } from '@renderer/stores/chatStore'
import type { AIConfig } from '@renderer/types/chat'

export const Settings: React.FC = () => {
  const [open, setOpen] = useState(false)
  const config = useChatStore((state) => state.config)
  const setConfig = useChatStore((state) => state.setConfig)

  const [formData, setFormData] = useState<AIConfig>(
    config || {
      provider: 'openai',
      apiKey: '',
      baseURL: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    }
  )

  const handleSave = () => {
    setConfig(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI Configuration</DialogTitle>
          <DialogDescription>Configure your AI provider settings</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="provider" className="text-sm font-medium">
              Provider
            </label>
            <select
              id="provider"
              value={formData.provider}
              onChange={(e) =>
                setFormData({ ...formData, provider: e.target.value as AIConfig['provider'] })
              }
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="sk-..."
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="baseURL" className="text-sm font-medium">
              Base URL (Optional)
            </label>
            <input
              id="baseURL"
              type="text"
              value={formData.baseURL || ''}
              onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="model" className="text-sm font-medium">
              Model
            </label>
            <input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
              placeholder="gpt-4"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="temperature" className="text-sm font-medium">
              Temperature: {formData.temperature}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature || 0.7}
              onChange={(e) =>
                setFormData({ ...formData, temperature: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="maxTokens" className="text-sm font-medium">
              Max Tokens
            </label>
            <input
              id="maxTokens"
              type="number"
              value={formData.maxTokens || 2000}
              onChange={(e) =>
                setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2000 })
              }
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
