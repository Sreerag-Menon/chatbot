'use client'

import { chatAPI } from '@/lib/api'
import type { Message } from '@/lib/types'
import { AlertCircle, Bot, MessageSquare, Send, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface AdminChatWindowProps {
    sessionId: string
    agentId: string
    onClose: () => void
}

export function AdminChatWindow({ sessionId, agentId, onClose }: AdminChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string>()
    const [isConnected, setIsConnected] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [lastMessageCount, setLastMessageCount] = useState(0)
    const [isTyping, setIsTyping] = useState(false)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Poll for new messages
    useEffect(() => {
        if (!isConnected) return

        const pollInterval = setInterval(async () => {
            try {
                const history = await chatAPI.getSessionHistory(sessionId)
                const newMessages: Message[] = history.history.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    agent_id: msg.agent_id,
                    confidence: msg.confidence
                }))

                // Only update if there are new messages
                if (newMessages.length > lastMessageCount) {
                    setMessages(newMessages)
                    setLastMessageCount(newMessages.length)
                }
            } catch (err) {
                console.error('Error polling for messages:', err)
            }
        }, 2000) // Poll every 2 seconds

        return () => clearInterval(pollInterval)
    }, [isConnected, sessionId, lastMessageCount])

    // Load session history
    useEffect(() => {
        const loadSessionHistory = async () => {
            try {
                const history = await chatAPI.getSessionHistory(sessionId)
                if (history.escalated && history.agent_id === agentId) {
                    setIsConnected(true)
                    // Convert the history to Message format
                    const formattedMessages: Message[] = history.history.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        agent_id: msg.agent_id,
                        confidence: msg.confidence
                    }))
                    setMessages(formattedMessages)
                    setLastMessageCount(formattedMessages.length)
                } else {
                    setError('Session not found or not authorized for this agent')
                }
            } catch (err) {
                console.error('Error loading session:', err)
                setError('Failed to load session')
            }
        }

        loadSessionHistory()
    }, [sessionId, agentId])

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return

        setIsLoading(true)
        setIsTyping(true)
        setError(undefined)

        // Add agent message immediately
        const agentMessage: Message = {
            role: 'agent',
            content: inputMessage,
            timestamp: new Date().toISOString(),
            agent_id: agentId
        }
        setMessages(prev => [...prev, agentMessage])

        const messageToSend = inputMessage
        setInputMessage('')

        try {
            await chatAPI.sendAgentMessage({
                session_id: sessionId,
                agent_id: agentId,
                message: messageToSend
            })

            // Update the last message count to prevent duplicate polling
            setLastMessageCount(prev => prev + 1)
        } catch (err) {
            console.error('Error sending agent message:', err)
            setError('Failed to send message. Please try again.')

            // Remove the agent message if there was an error
            setMessages(prev => prev.slice(0, -1))
        } finally {
            setIsLoading(false)
            setIsTyping(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    if (!isConnected) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
                        <p className="text-gray-600 mb-4">{error || 'Unable to connect to session'}</p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Agent Chat</h2>
                            <p className="text-sm text-gray-500">
                                Session: {sessionId.slice(-8)} | Agent: {agentId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <p>You are now connected to this escalated session.</p>
                            <p className="text-sm mt-2">Start chatting with the customer below.</p>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === 'agent'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {message.role === 'agent' ? (
                                        <User className="w-4 h-4" />
                                    ) : (
                                        <Bot className="w-4 h-4" />
                                    )}
                                    <span className="text-xs opacity-75">
                                        {message.role === 'agent' ? 'You' : 'Customer'}
                                    </span>
                                </div>
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-75 mt-1">
                                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <AlertCircle size={16} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="px-4 py-2 bg-gray-50 border-t">
                        <div className="flex items-center gap-2 text-gray-500">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-sm">Agent is typing...</span>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
} 