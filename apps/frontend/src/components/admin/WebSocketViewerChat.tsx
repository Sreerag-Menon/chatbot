"use client"

import { chatAPI } from '@/lib/api'
import type { Message } from '@/lib/types'
import { Bot, MessageSquare, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface WebSocketViewerChatProps {
    sessionId: string
    onEscalated?: (agentId: string) => void
    showInterveneButton?: boolean
}

interface HistoryEntry {
    role: string
    content: string
    timestamp: string
}

export function WebSocketViewerChat({ sessionId, onEscalated, showInterveneButton = true }: WebSocketViewerChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [ws, setWs] = useState<WebSocket | null>(null)
    const [isUserTyping, setIsUserTyping] = useState(false)
    const [error, setError] = useState<string>()
    const typingTimeoutRef = useRef<number | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const sc = scrollRef.current
        if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' })
        else messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages])

    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_BACKEND_WS_URL
        const httpBase = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || process.env.NEXT_PUBLIC_API_URL
        let wsUrl = ''
        if (base) {
            wsUrl = base.replace(/\/$/, '') + `/ws/watch/${sessionId}`
        } else if (httpBase) {
            try {
                const u = new URL(httpBase)
                const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
                wsUrl = `${proto}//${u.host}/ws/watch/${sessionId}`
            } catch {
                wsUrl = `/ws/watch/${sessionId}`
            }
        } else if (typeof window !== 'undefined') {
            const { protocol, hostname, port } = window.location
            const wsProto = protocol === 'https:' ? 'wss:' : 'ws:'
            const targetPort = port === '3000' || port === '' ? '8000' : port
            wsUrl = `${wsProto}//${hostname}:${targetPort}/ws/watch/${sessionId}`
        } else {
            wsUrl = `ws://localhost:8000/ws/watch/${sessionId}`
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
                    case 'history_snapshot': {
                        const hist = (data.history as HistoryEntry[] | undefined) || []
                        const mapped: Message[] = hist.map((m) => ({
                            role: m.role as 'user' | 'assistant' | 'agent',
                            content: m.content,
                            timestamp: m.timestamp,
                        }))
                        setMessages(mapped)
                        break
                    }
                    case 'user_message': {
                        setMessages(prev => [...prev, { role: 'user', content: data.message, timestamp: data.timestamp }])
                        break
                    }
                    case 'bot_message': {
                        setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: data.timestamp }])
                        break
                    }
                    case 'agent_message': {
                        setMessages(prev => [...prev, { role: 'agent', content: data.message, timestamp: data.timestamp }])
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
                console.error('Error parsing watcher WebSocket message:', err)
            }
        }

        websocket.onerror = (error) => {
            console.error('Watcher WebSocket error:', error)
            setError('Connection error. Please refresh.')
            setIsConnected(false)
        }

        websocket.onclose = () => {
            setIsConnected(false)
        }

        setWs(websocket)
        return () => { websocket.close() }
    }, [sessionId])

    async function handleIntervene() {
        try {
            const res = await chatAPI.escalateSession(sessionId)
            if (res.agent_id) {
                await chatAPI.takeSession(res.agent_id)
                onEscalated?.(res.agent_id)
            }
        } catch (e) {
            console.error('Failed to escalate session', e)
            setError('Failed to escalate. Try again.')
        }
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Viewer</h3>
                        <p className="text-sm text-white/70">Session {sessionId?.slice(-8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {showInterveneButton && (
                        <button
                            onClick={handleIntervene}
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

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`min-w-0 max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-500' : message.role === 'agent' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-gray-600 to-gray-700'}`}>
                                    {message.role === 'user' || message.role === 'agent' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : message.role === 'agent' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'}`}>
                                    <div className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{message.content}</div>
                                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : message.role === 'agent' ? 'text-emerald-100' : 'text-white/50'}`}>
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Just now'}
                                    </div>
                                </div>
                            </div>
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
        </div>
    )
}



