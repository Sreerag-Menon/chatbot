'use client'

import type { Message } from '@/lib/types'
import { AlertCircle, Bot, MessageSquare, Send, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface WebSocketAdminChatProps {
    sessionId: string
    agentId: string
    onClose: () => void
}

export function WebSocketAdminChat({ sessionId, agentId, onClose }: WebSocketAdminChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string>()
    const [isConnected, setIsConnected] = useState(false)
    const [ws, setWs] = useState<WebSocket | null>(null)
    const [conversationSummary, setConversationSummary] = useState<string>('')
    const [summaryLoading, setSummaryLoading] = useState(true)
    const [summaryLoaded, setSummaryLoaded] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Initialize WebSocket connection for agent
    useEffect(() => {
        const wsUrl = `ws://localhost:8000/ws/agent/${agentId}`
        const websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
            console.log('Agent WebSocket connected')
            setIsConnected(true)
            setError(undefined)
        }

        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                console.log('Agent WebSocket message received:', data)

                switch (data.type) {
                    case 'agent_status':
                        console.log('Agent status received:', data)
                        break

                    case 'new_escalated_session':
                        console.log('New escalated session:', data)
                        break

                    case 'message_sent':
                        console.log('Message sent confirmation:', data)
                        break

                    case 'user_message':
                        // Handle incoming user message
                        const userMessage: Message = {
                            role: 'user',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, userMessage])
                        break

                    case 'error':
                        setError(data.message)
                        break
                }
            } catch (err) {
                console.error('Error parsing agent WebSocket message:', err)
            }
        }

        websocket.onerror = (error) => {
            console.error('Agent WebSocket error:', error)
            setError('Connection error. Please refresh.')
            setIsConnected(false)
        }

        websocket.onclose = () => {
            console.log('Agent WebSocket disconnected')
            setIsConnected(false)
        }

        setWs(websocket)

        return () => {
            websocket.close()
        }
    }, [agentId])

    // Load session history
    useEffect(() => {
        const loadSessionHistory = async () => {
            try {
                const response = await fetch(`http://localhost:8000/session/${sessionId}/history`)
                if (response.ok) {
                    const history = await response.json()
                    if (history.escalated && history.agent_id === agentId) {
                        // Convert the history to Message format
                        const formattedMessages: Message[] = history.history.map((msg: any) => ({
                            role: msg.role,
                            content: msg.content,
                            timestamp: msg.timestamp,
                            agent_id: msg.agent_id,
                            confidence: msg.confidence
                        }))
                        setMessages(formattedMessages)
                    } else {
                        setError('Session not found or not authorized for this agent')
                    }
                } else {
                    setError('Failed to load session')
                }
            } catch (err) {
                console.error('Error loading session:', err)
                setError('Failed to load session')
            }
        }

        loadSessionHistory()
    }, [sessionId, agentId])

    // Load conversation summary
    useEffect(() => {
        const loadConversationSummary = async () => {
            if (summaryLoaded) return // Prevent repeated calls

            try {
                setSummaryLoading(true)
                const response = await fetch(`http://localhost:8000/session/${sessionId}/summary`)
                if (response.ok) {
                    const summaryData = await response.json()
                    if (summaryData.status === 'success') {
                        setConversationSummary(summaryData.summary)
                        setSummaryLoaded(true)
                    }
                }
            } catch (err) {
                console.error('Error loading conversation summary:', err)
            } finally {
                setSummaryLoading(false)
            }
        }

        loadConversationSummary()
    }, [sessionId, summaryLoaded])

    const sendMessage = async () => {
        if (!inputMessage.trim() || !ws || !isConnected || isLoading) return

        setIsLoading(true)
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
            // Send message via WebSocket
            ws.send(JSON.stringify({
                type: 'agent_message',
                session_id: sessionId,
                message: messageToSend
            }))
        } catch (err) {
            console.error('Error sending agent message:', err)
            setError('Failed to send message. Please try again.')

            // Remove the agent message if there was an error
            setMessages(prev => prev.slice(0, -1))
        } finally {
            setIsLoading(false)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <div>
                            <h2 className="font-semibold text-gray-900">Agent Chat</h2>
                            <p className="text-sm text-gray-500">
                                Session: {sessionId?.slice(-8) || 'Unknown'} | Agent: {agentId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {/* Conversation Summary */}
                    {!summaryLoading && conversationSummary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">i</span>
                                </div>
                                <h3 className="font-semibold text-blue-900">Conversation Summary</h3>
                            </div>
                            <p className="text-blue-800 text-sm leading-relaxed">{conversationSummary}</p>
                        </div>
                    )}

                    {summaryLoading && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-blue-800 text-sm">Loading conversation summary...</span>
                            </div>
                        </div>
                    )}

                    {/* Full Conversation History */}
                    <div className="border-t border-gray-200 pt-4 bg-white rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Full Conversation History</h4>

                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <p>You are now connected to this escalated session.</p>
                                <p className="text-sm mt-2">Start chatting with the customer below.</p>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'agent' ? 'justify-end' : 'justify-start'} mb-3`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === 'agent'
                                            ? 'bg-blue-500 text-white'
                                            : message.role === 'assistant'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {message.role === 'agent' ? (
                                            <User className="w-4 h-4" />
                                        ) : message.role === 'assistant' ? (
                                            <Bot className="w-4 h-4" />
                                        ) : (
                                            <User className="w-4 h-4" />
                                        )}
                                        <span className="text-xs opacity-75">
                                            {message.role === 'agent' ? 'You (Agent)' :
                                                message.role === 'assistant' ? 'Bot' : 'Customer'}
                                        </span>
                                    </div>
                                    <p className="text-sm">{message.content}</p>
                                    <p className="text-xs opacity-75 mt-1">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <AlertCircle size={16} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!isConnected || isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputMessage.trim() || !isConnected || isLoading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-2 mt-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
} 