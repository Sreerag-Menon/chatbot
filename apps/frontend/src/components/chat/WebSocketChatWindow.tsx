"use client"

import type { Message } from '@/lib/types'
import { Bot, Send, Sparkles, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface WebSocketChatWindowProps {
    initialSessionId?: string
}

export function WebSocketChatWindow({ initialSessionId }: WebSocketChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [sessionId] = useState<string>(() => {
        // Generate a session ID if none provided (for widget usage)
        if (initialSessionId) return initialSessionId
        const generatedId = 'session_' + Math.random().toString(36).substr(2, 9)
        console.log('Generated session ID:', generatedId)
        return generatedId
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string>()
    const [isEscalated, setIsEscalated] = useState(false)
    const [agentId, setAgentId] = useState<string | undefined>(undefined)
    const [isConnectingToHuman, setIsConnectingToHuman] = useState(false)
    const [likedMessages, setLikedMessages] = useState<Set<number>>(new Set())
    const [dislikedMessages, setDislikedMessages] = useState<Set<number>>(new Set())
    const [ws, setWs] = useState<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isThinking, setIsThinking] = useState(false)
    const [agentTyping, setAgentTyping] = useState(false)
    const agentTypingTimeoutRef = useRef<number | null>(null)
    const lastTypingSentRef = useRef<number>(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        const sc = scrollRef.current
        if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' })
        else messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages, isThinking])

    // Initialize WebSocket connection
    useEffect(() => {
        if (!sessionId) {
            console.log('No session ID available, skipping WebSocket connection')
            return
        }

        console.log('Connecting to WebSocket with session ID:', sessionId)

        const base = process.env.NEXT_PUBLIC_BACKEND_WS_URL
        const httpBase = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || process.env.NEXT_PUBLIC_API_URL
        let wsUrl = ''
        if (base) {
            wsUrl = base.replace(/\/$/, '') + `/ws/session/${sessionId}`
        } else if (httpBase) {
            try {
                const u = new URL(httpBase)
                const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
                wsUrl = `${proto}//${u.host}/ws/session/${sessionId}`
            } catch {
                wsUrl = `/ws/session/${sessionId}`
            }
        } else if (typeof window !== 'undefined') {
            const { protocol, hostname, port } = window.location
            const wsProto = protocol === 'https:' ? 'wss:' : 'ws:'
            const targetPort = port === '3000' || port === '' ? '8000' : port
            wsUrl = `${wsProto}//${hostname}:${targetPort}/ws/session/${sessionId}`
        } else {
            wsUrl = `ws://localhost:8000/ws/session/${sessionId}`
        }

        console.log('WebSocket URL:', wsUrl)
        const websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
            console.log('WebSocket connected successfully')
            setIsConnected(true)
            setError(undefined)
        }

        websocket.onmessage = (event) => {
            console.log('WebSocket message received:', event.data)
            try {
                const data = JSON.parse(event.data)
                console.log('Parsed message data:', data)
                switch (data.type) {
                    case 'session_status': {
                        // reflect server-side escalation state
                        if (typeof data.escalated === 'boolean') setIsEscalated(Boolean(data.escalated))
                        if (data.agent_id) setAgentId(data.agent_id)
                        break
                    }
                    case 'bot_message': {
                        console.log('Processing bot message:', data.message)
                        setIsThinking(false)
                        if (data.escalated) {
                            setIsEscalated(true)
                            if (data.agent_id) setAgentId(data.agent_id)
                            setIsConnectingToHuman(false)
                        }
                        const botMessage: Message = {
                            role: 'assistant',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, botMessage])
                        break
                    }
                    case 'agent_message': {
                        console.log('Processing agent message:', data.message)
                        setIsThinking(false)
                        setIsEscalated(true)
                        if (data.agent_id) setAgentId(data.agent_id)
                        const agentMessage: Message = {
                            role: 'agent',
                            content: data.message,
                            timestamp: data.timestamp,
                        }
                        setMessages(prev => [...prev, agentMessage])
                        break
                    }
                    case 'agent_typing': {
                        console.log('Agent typing indicator received')
                        setAgentTyping(true)
                        if (agentTypingTimeoutRef.current) window.clearTimeout(agentTypingTimeoutRef.current)
                        agentTypingTimeoutRef.current = window.setTimeout(() => setAgentTyping(false), 3000)
                        break
                    }
                    case 'error':
                        console.log('Error message received:', data.message)
                        setError(data.message)
                        setIsThinking(false)
                        break
                    default:
                        console.log('Unknown message type:', data.type, data)
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err)
            }
        }

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error)
            setError('Connection error. Please refresh.')
            setIsConnected(false)
        }

        websocket.onclose = () => {
            console.log('WebSocket connection closed')
            setIsConnected(false)
        }

        setWs(websocket)
        return () => { websocket.close() }
    }, [sessionId])

    const sendTyping = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const now = Date.now()
        if (now - lastTypingSentRef.current < 1500) return
        lastTypingSentRef.current = now
        ws.send(JSON.stringify({ type: 'typing', session_id: sessionId }))
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputMessage(e.target.value)
        sendTyping()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(inputMessage)
        }
    }

    const sendMessage = async (content: string) => {
        console.log('Attempting to send message:', { content, sessionId, wsState: ws?.readyState, isConnected })

        if (!content.trim() || !ws || ws.readyState !== WebSocket.OPEN) {
            console.log('Cannot send message:', {
                hasContent: !!content.trim(),
                hasWs: !!ws,
                wsState: ws?.readyState,
                isConnected
            })
            return
        }

        const userMessage: Message = {
            role: 'user',
            content: content.trim(),
            timestamp: new Date().toISOString(),
        }

        setMessages(prev => [...prev, userMessage])
        setInputMessage('')
        setIsLoading(true)
        setIsThinking(!isEscalated)

        try {
            const messageData = {
                type: 'user_message',
                session_id: sessionId,
                message: content.trim(),
            }
            console.log('Sending WebSocket message:', messageData)
            ws.send(JSON.stringify(messageData))
            console.log('Message sent successfully')
        } catch (err) {
            console.error('Error sending message:', err)
            setError('Failed to send message')
            setIsThinking(false)
        } finally {
            setIsLoading(false)
        }
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
        <div className="flex-1 flex flex-col min-h-0">
            {/* Connection Status */}
            <div className="px-4 py-2 border-b border-white/20 bg-white/5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Session: {sessionId?.slice(-8)}</span>
                    <div className="flex items-center gap-3">
                        {agentTyping && <span className="text-white/80">Agent is typing…</span>}
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-white/70">{isConnected ? 'Connected' : 'Connecting...'}</span>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="relative flex-1 overflow-y-auto p-4 space-y-4 pb-28 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`min-w-0 max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' : message.role === 'agent' ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-gray-600 to-gray-700'
                                    }`}>
                                    {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : message.role === 'agent' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white' : message.role === 'agent' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                                    }`}>
                                    <div className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{message.content}</div>
                                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-fuchsia-100' : message.role === 'agent' ? 'text-blue-100' : 'text-white/50'}`}>
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

                {isThinking && !isEscalated && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%]">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-white/70 text-sm">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Connecting to Human Message */}
                {isConnectingToHuman && (
                    <div className="flex justify-center">
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 text-center max-w-md">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-blue-300 animate-pulse" />
                                <span className="text-blue-200 font-medium">Connecting to Human Support</span>
                                <Sparkles className="w-5 h-5 text-blue-300 animate-pulse" />
                            </div>
                            <div className="flex space-x-1 justify-center">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                            {error}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20 bg-white/10 backdrop-blur-xl">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            value={inputMessage}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isEscalated ? 'Waiting for agent response...' : 'Type your message...'}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-transparent"
                            rows={1}
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                    </div>
                    <button
                        onClick={() => sendMessage(inputMessage)}
                        disabled={!inputMessage.trim() || isLoading || !isConnected}
                        className="px-4 py-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white rounded-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}
