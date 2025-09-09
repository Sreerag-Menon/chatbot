"use client"

import { chatAPI } from '@/lib/api'
import type { Message } from '@/lib/types'
import { Bot, MessageSquare, Send, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface WebSocketAdminChatProps {
    sessionId: string
    agentId: string
    onClose: () => void
    onIntervene?: () => void
    showInterveneButton?: boolean
}

interface HistoryEntry {
    role: string
    content: string
    timestamp: string
}

export function WebSocketAdminChat({ sessionId, agentId, onIntervene, showInterveneButton = false }: WebSocketAdminChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string>()
    const [isConnected, setIsConnected] = useState(false)
    const [ws, setWs] = useState<WebSocket | null>(null)
    const [conversationSummary, setConversationSummary] = useState<string>('')
    const [likedMessages, setLikedMessages] = useState<Set<number>>(new Set())
    const [dislikedMessages, setDislikedMessages] = useState<Set<number>>(new Set())
    const [isUserTyping, setIsUserTyping] = useState(false)
    const typingTimeoutRef = useRef<number | null>(null)
    const lastTypingSentRef = useRef<number>(0)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        const sc = scrollRef.current
        if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' })
        else messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages])

    // Load history & summary initially
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const hist = await chatAPI.getSessionHistory(sessionId)
                if (!cancelled && hist?.history) {
                    const mapped: Message[] = (hist.history as HistoryEntry[]).map((m) => ({
                        role: m.role as 'user' | 'assistant' | 'agent',
                        content: m.content,
                        timestamp: m.timestamp,
                    }))
                    setMessages(mapped)
                }
            } catch (_e) {
                if (!cancelled) setError('Failed to load conversation history')
            }
            try {
                const sum = await chatAPI.getSessionSummary(sessionId)
                if (!cancelled && sum?.status === 'success') setConversationSummary(sum.summary)
            } catch (_e) { }
        }
        load()
        return () => { cancelled = true }
    }, [sessionId])

    // Initialize WebSocket connection for agent
    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_BACKEND_WS_URL
        const httpBase = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || process.env.NEXT_PUBLIC_API_URL
        let wsUrl = ''
        if (base) {
            wsUrl = base.replace(/\/$/, '') + `/ws/agent/${agentId}`
        } else if (httpBase) {
            try {
                const u = new URL(httpBase)
                const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
                wsUrl = `${proto}//${u.host}/ws/agent/${agentId}`
            } catch {
                wsUrl = `/ws/agent/${agentId}`
            }
        } else if (typeof window !== 'undefined') {
            const { protocol, hostname, port } = window.location
            const wsProto = protocol === 'https:' ? 'wss:' : 'ws:'
            const targetPort = port === '3000' || port === '' ? '8000' : port
            wsUrl = `${wsProto}//${hostname}:${targetPort}/ws/agent/${agentId}`
        } else {
            wsUrl = `ws://localhost:8000/ws/agent/${agentId}`
        }
        const websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
            setIsConnected(true)
            setError(undefined)
        }

        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                switch (data.type) {
                    case 'user_message': {
                        const userMessage: Message = {
                            role: 'user',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, userMessage])
                        break
                    }
                    case 'bot_response': {
                        const botMessage: Message = {
                            role: 'assistant',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, botMessage])
                        break
                    }
                    case 'bot_message': {
                        const botMessage: Message = {
                            role: 'assistant',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, botMessage])
                        break
                    }
                    case 'agent_message': {
                        const agentMessage: Message = {
                            role: 'agent',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, agentMessage])
                        break
                    }
                    case 'user_typing': {
                        setIsUserTyping(true)
                        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
                        typingTimeoutRef.current = window.setTimeout(() => setIsUserTyping(false), 3000)
                        break
                    }
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
            setIsConnected(false)
        }

        setWs(websocket)
        return () => { websocket.close() }
    }, [agentId])

    const sendMessage = async (message: string) => {
        if (!message.trim() || !ws || ws.readyState !== WebSocket.OPEN) return
        setInputMessage('')
        setIsLoading(true)
        try {
            // Append locally as agent (align left)
            const agentMessage: Message = {
                role: 'agent',
                content: message.trim(),
                timestamp: new Date().toISOString(),
            }
            setMessages(prev => [...prev, agentMessage])
            // Send via WebSocket
            ws.send(JSON.stringify({
                type: 'agent_message',
                session_id: sessionId,
                agent_id: agentId,
                message: message.trim(),
            }))
        } catch (err) {
            console.error('Error sending message:', err)
            setError('Failed to send message')
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(inputMessage.trim())
        }
    }

    const sendTyping = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const now = Date.now()
        if (now - lastTypingSentRef.current < 1500) return
        lastTypingSentRef.current = now
        ws.send(JSON.stringify({ type: 'typing', session_id: sessionId, agent_id: agentId }))
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputMessage(e.target.value)
        sendTyping()
    }

    const handleLike = (messageIndex: number) => {
        setLikedMessages(prev => {
            const newSet = new Set(prev)
            newSet.add(messageIndex)
            return newSet
        })
        setDislikedMessages(prev => {
            const newSet = new Set(prev)
            newSet.delete(messageIndex)
            return newSet
        })
    }

    const handleDislike = (messageIndex: number) => {
        setDislikedMessages(prev => {
            const newSet = new Set(prev)
            newSet.add(messageIndex)
            return newSet
        })
        setLikedMessages(prev => {
            const newSet = new Set(prev)
            newSet.delete(messageIndex)
            return newSet
        })
    }

    const handleEscalate = async () => {
        // Send escalation message instead of calling API
        const escalationMessage = "Please escalate this conversation to a human support agent."
        await sendMessage(escalationMessage)
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Customer Support</h3>
                        <p className="text-sm text-white/70">Session {sessionId?.slice(-8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {showInterveneButton && onIntervene && (
                        <button
                            onClick={onIntervene}
                            className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform"
                        >
                            Intervene
                        </button>
                    )}
                    {isUserTyping && (
                        <div className="text-xs text-white/80">Customer is typing…</div>
                    )}
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-sm text-white/70">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`min-w-0 max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-gray-600 to-gray-700'
                                    }`}>
                                    {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                                    }`}>
                                    <div className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{message.content}</div>
                                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-white/50'}`}>
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Just now'}
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons for bot messages */}
                            {message.role === 'assistant' && (
                                <div className="flex items-center gap-2 mt-2 ml-11">
                                    <button
                                        onClick={() => handleLike(index)}
                                        className={`p-1.5 rounded-lg transition-all duration-200 ${likedMessages.has(index)
                                            ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70 border border-white/20'
                                            }`}
                                        title="Like this response"
                                    >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDislike(index)}
                                        className={`p-1.5 rounded-lg transition-all duration-200 ${dislikedMessages.has(index)
                                            ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70 border border-white/20'
                                            }`}
                                        title="Dislike this response"
                                    >
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={handleEscalate}
                                        className="text-xs text-blue-300 hover:text-blue-200 underline cursor-pointer transition-colors"
                                        title="Click to escalate to human support"
                                    >
                                        Connect to human
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                            {error}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/20">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            value={inputMessage}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                            rows={1}
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                    </div>
                    <button
                        onClick={() => sendMessage(inputMessage.trim())}
                        disabled={!inputMessage.trim() || !isConnected || isLoading}
                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
} 