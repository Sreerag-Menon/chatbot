'use client'

import { chatAPI } from '@/lib/api'
import type { ChatResponse, Message } from '@/lib/types'
import { generateSessionId } from '@/lib/utils'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

interface ChatWindowProps {
  initialSessionId?: string
}

export function ChatWindow({ initialSessionId }: ChatWindowProps) {
  const [sessionId, setSessionId] = useState(initialSessionId || generateSessionId())
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEscalated, setIsEscalated] = useState(false)
  const [agentId, setAgentId] = useState<string>()
  const [escalatedAt, setEscalatedAt] = useState<string>()
  const [error, setError] = useState<string>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    setIsLoading(true)
    setError(undefined)

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response: ChatResponse = await chatAPI.sendMessage({
        session_id: sessionId,
        message: content
      })

      // Add bot response
      const botMessage: Message = {
        role: 'assistant',
        content: response.reply,
        confidence: response.confidence_score,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, botMessage])

      // Update escalation status
      if (response.escalated) {
        setIsEscalated(true)
        setAgentId(response.agent_id)
        setEscalatedAt(new Date().toISOString())
      }

    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')

      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAgentMessage = async (content: string) => {
    if (!content.trim() || !agentId) return

    setIsLoading(true)
    setError(undefined)

    // Add agent message immediately
    const agentMessage: Message = {
      role: 'agent',
      content,
      timestamp: new Date().toISOString(),
      agent_id: agentId
    }
    setMessages(prev => [...prev, agentMessage])

    try {
      await chatAPI.sendAgentMessage({
        session_id: sessionId,
        agent_id: agentId,
        message: content
      })
    } catch (err) {
      console.error('Error sending agent message:', err)
      setError('Failed to send message. Please try again.')

      // Remove the agent message if there was an error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <ChatHeader
        sessionId={sessionId}
        isEscalated={isEscalated}
        agentId={agentId}
        escalatedAt={escalatedAt}
        messageCount={messages.length}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Welcome to HotelsByDay! How can I help you today?</p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isLastMessage={index === messages.length - 1}
          />
        ))}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Escalation Notice */}
        {isEscalated && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle size={16} />
            <span className="text-sm">
              This conversation has been escalated to a human agent. They will assist you shortly.
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput
        onSendMessage={isEscalated ? handleAgentMessage : sendMessage}
        isLoading={isLoading}
        disabled={isLoading}
        placeholder={
          isEscalated
            ? "Human agent is typing..."
            : "Ask about HotelsByDay services..."
        }
      />
    </div>
  )
} 