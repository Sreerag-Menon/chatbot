'use client'

import { cn } from '@/lib/utils'
import { Loader2, Send } from 'lucide-react'
import { KeyboardEvent, useState } from 'react'

interface MessageInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "Type your message..."
}: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-white">
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          className={cn(
            "w-full min-h-[44px] max-h-32 px-3 py-2 border border-gray-300 text-black rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "resize-none text-sm",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          rows={1}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={!message.trim() || isLoading || disabled}
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          "bg-blue-500 text-white hover:bg-blue-600 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        )}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
      </button>
    </div>
  )
} 