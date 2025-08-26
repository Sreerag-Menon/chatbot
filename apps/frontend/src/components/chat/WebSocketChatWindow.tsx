'use client'

import { Message } from '@/lib/types'
import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

function generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9)
}

interface WebSocketChatWindowProps {
    initialSessionId?: string
}

export function WebSocketChatWindow({ initialSessionId }: WebSocketChatWindowProps) {
    const [sessionId] = useState(initialSessionId || generateSessionId())
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isEscalated, setIsEscalated] = useState(false)
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
                session_id: sessionId,
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
        <div className="flex-1 flex flex-col bg-white">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <MessageBubble key={index} message={message} />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Escalation notice */}
                {isEscalated && (
                    <div className="flex justify-center">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                            <p className="text-blue-800 text-sm">
                                Your conversation has been escalated to a human agent. Please wait for their response.
                            </p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
                <MessageInput
                    onSendMessage={sendMessage}
                    isLoading={isLoading}
                    disabled={!isConnected}
                    placeholder={isEscalated ? "Waiting for agent response..." : "Type your message..."}
                />
            </div>
        </div>
    )
} 