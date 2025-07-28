'use client'

import type { Message } from '@/lib/types'
import { generateSessionId } from '@/lib/utils'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

interface WebSocketChatWindowProps {
    initialSessionId?: string
}

export function WebSocketChatWindow({ initialSessionId }: WebSocketChatWindowProps) {
    const [sessionId, setSessionId] = useState(initialSessionId || generateSessionId())
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isEscalated, setIsEscalated] = useState(false)
    const [agentId, setAgentId] = useState<string>()
    const [escalatedAt, setEscalatedAt] = useState<string>()
    const [error, setError] = useState<string>()
    const [isConnected, setIsConnected] = useState(false)
    const [ws, setWs] = useState<WebSocket | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Initialize WebSocket connection
    useEffect(() => {
        const wsUrl = `ws://localhost:8000/ws/session/${sessionId}`
        const websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
            console.log('WebSocket connected')
            setIsConnected(true)
            setError(undefined)
        }

        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                console.log('WebSocket message received:', data)

                switch (data.type) {
                    case 'session_status':
                        setIsEscalated(data.escalated)
                        setAgentId(data.agent_id)
                        break

                    case 'bot_message':
                        const botMessage: Message = {
                            role: 'assistant',
                            content: data.message,
                            confidence: data.confidence_score,
                            timestamp: new Date().toISOString()
                        }
                        setMessages(prev => [...prev, botMessage])

                        if (data.escalated) {
                            setIsEscalated(true)
                            setAgentId(data.agent_id)
                            setEscalatedAt(new Date().toISOString())
                        }
                        break

                    case 'agent_message':
                        const agentMessage: Message = {
                            role: 'agent',
                            content: data.message,
                            timestamp: data.timestamp,
                            agent_id: data.agent_id
                        }
                        setMessages(prev => [...prev, agentMessage])
                        break

                    case 'error':
                        setError(data.message)
                        break
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err)
            }
        }

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error)
            setError('Connection error. Please refresh the page.')
            setIsConnected(false)
        }

        websocket.onclose = () => {
            console.log('WebSocket disconnected')
            setIsConnected(false)
        }

        setWs(websocket)

        return () => {
            websocket.close()
        }
    }, [sessionId])

    const sendMessage = async (content: string) => {
        if (!content.trim() || !ws || !isConnected) return

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
            // Send message via WebSocket
            ws.send(JSON.stringify({
                type: 'user_message',
                message: content
            }))
        } catch (err) {
            console.error('Error sending message:', err)
            setError('Failed to send message. Please try again.')

            // Remove the user message if there was an error
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

            {/* Connection Status */}
            {!isConnected && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                    <AlertCircle size={16} />
                    <span className="text-sm">Connecting to chat...</span>
                </div>
            )}

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
                onSendMessage={sendMessage}
                isLoading={isLoading}
                disabled={isLoading || !isConnected}
                placeholder={
                    !isConnected
                        ? "Connecting..."
                        : isEscalated
                            ? "Human agent is typing..."
                            : "Ask about HotelsByDay services..."
                }
            />
        </div>
    )
} 