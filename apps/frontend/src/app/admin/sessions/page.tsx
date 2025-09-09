"use client"

import { WebSocketAdminChat } from '@/components/admin/WebSocketAdminChat'
import { WebSocketViewerChat } from '@/components/admin/WebSocketViewerChat'
import { chatAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ArrowLeft, MessageSquare, RefreshCw, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Session {
    session_id: string
    escalated: boolean
    agent_id?: string
    escalated_at?: string
    message_count: number
}

export default function AdminSessionsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>()
    const [activeChat, setActiveChat] = useState<{ sessionId: string; agentId: string } | null>(null)
    const [showChatModal, setShowChatModal] = useState(false)
    const [activeSummary, setActiveSummary] = useState<string>('')
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryOpen, setSummaryOpen] = useState(true)

    const fetchSessions = useCallback(async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('chatbot_auth_token') : null
            if (!token) return
            setLoading(true)
            const response = await chatAPI.getAllSessions()
            setSessions(response.sessions || [])
        } catch (err) {
            console.error('Error fetching sessions:', err)
            setError('Failed to load sessions')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()
        const interval = setInterval(fetchSessions, 30000)
        return () => clearInterval(interval)
    }, [fetchSessions])

    const loadSummary = useCallback(async (sessionId: string) => {
        try {
            setSummaryLoading(true)
            const res = await chatAPI.getSessionSummary(sessionId)
            if (res?.status === 'success') setActiveSummary(res.summary)
            else setActiveSummary('')
        } catch (e) {
            console.error('Failed to load session summary', e)
            setActiveSummary('')
        } finally {
            setSummaryLoading(false)
        }
    }, [])

    const handleIntervene = async (sessionId: string) => {
        try {
            const res = await chatAPI.escalateSession(sessionId)
            if (res.agent_id) {
                await chatAPI.takeSession(res.agent_id)
                setActiveChat({ sessionId, agentId: res.agent_id })
                setShowChatModal(true)
                loadSummary(sessionId)
            }
            fetchSessions()
        } catch (err) {
            console.error('Error intervening session:', err)
            setError('Failed to intervene on session')
        }
    }

    const handleCloseChat = () => {
        setActiveChat(null)
        setShowChatModal(false)
        setActiveSummary('')
        fetchSessions()
    }

    useEffect(() => {
        if (activeChat?.sessionId) loadSummary(activeChat.sessionId)
    }, [activeChat?.sessionId, loadSummary])

    return (
        <main className="relative min-h-screen antialiased overflow-hidden">
            {/* Animated gradient background */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-700 via-indigo-700 to-cyan-600" />

            {/* Ambient blobs */}
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />

            <div className="relative z-10 min-h-screen">
                {/* Header */}
                <div className="bg-white/10 backdrop-blur-xl border-b border-white/20">
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => router.push('/admin')}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                                    <MessageSquare className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">All Sessions</h1>
                                    <p className="text-white/70">Monitor and manage customer conversations</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 px-4 py-2">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white">{sessions.length}</div>
                                        <div className="text-xs text-white/70">Total Sessions</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/70">Total Sessions</p>
                                    <p className="text-3xl font-bold text-white">{sessions.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/70">Active</p>
                                    <p className="text-3xl font-bold text-white">{sessions.filter(s => !s.escalated).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/70">Escalated</p>
                                    <p className="text-3xl font-bold text-white">{sessions.filter(s => s.escalated).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <RefreshCw className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/70">Auto-refresh</p>
                                    <p className="text-3xl font-bold text-white">30s</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Sessions List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-white">All Sessions</h2>
                                    <button
                                        onClick={fetchSessions}
                                        disabled={loading}
                                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                                        <p className="text-white/70 mt-2">Loading sessions...</p>
                                    </div>
                                ) : error ? (
                                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-red-300">
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-12 h-12 text-white/30 mx-auto mb-4" />
                                        <p className="text-white/70">No sessions available</p>
                                        <p className="text-white/50 text-sm">Customer conversations will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {sessions.map((session) => (
                                            <div
                                                key={session.session_id}
                                                className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                                                <User className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-white">Session {session.session_id?.slice(-8)}</p>
                                                                <p className="text-sm text-white/70">
                                                                    {session.escalated_at ? `Escalated ${new Date(session.escalated_at).toLocaleString()}` : 'Active'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-white/60">
                                                            <span>Messages: {session.message_count || 0}</span>
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${session.escalated
                                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                                : 'bg-green-500/20 text-green-300'
                                                                }`}>
                                                                {session.escalated ? 'Escalated' : 'Active'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                // If escalated, open agent chat; otherwise open viewer
                                                                if (session.escalated && session.agent_id) {
                                                                    setActiveChat({ sessionId: session.session_id, agentId: session.agent_id })
                                                                } else {
                                                                    setActiveChat({ sessionId: session.session_id, agentId: '' })
                                                                }
                                                                setShowChatModal(true)
                                                                loadSummary(session.session_id)
                                                            }}
                                                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                                                        >
                                                            View Chat
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Chat Panel */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                                <h2 className="text-xl font-semibold text-white mb-6">Active Chat</h2>

                                {activeChat ? (
                                    <div className="space-y-4">
                                        <div className="bg-white/5 rounded-lg p-4">
                                            <p className="text-white font-medium">Session: {activeChat.sessionId?.slice(-8)}</p>
                                            <p className="text-white/70 text-sm">Agent: {activeChat.agentId}</p>
                                        </div>

                                        <button
                                            onClick={() => setShowChatModal(true)}
                                            className="w-full px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium rounded-lg hover:scale-105 transition-transform"
                                        >
                                            Open Chat
                                        </button>

                                        <button
                                            onClick={handleCloseChat}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                                        >
                                            Close Session
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-12 h-12 text-white/30 mx-auto mb-4" />
                                        <p className="text-white/70">No active chat</p>
                                        <p className="text-white/50 text-sm">Intervene on a session to start chatting</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Modal */}
            {showChatModal && activeChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop with blur */}
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-md"
                        onClick={handleCloseChat}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-5xl h-[85vh] mx-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl grid grid-cols-1 lg:grid-cols-5">
                        {/* Modal Header */}
                        <div className="lg:col-span-5 flex items-center justify-between p-6 border-b border-white/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Customer Support Chat</h3>
                                    <p className="text-sm text-white/70">Session: {activeChat.sessionId?.slice(-8)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSummaryOpen((s) => !s)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                >
                                    {summaryOpen ? 'Hide Summary' : 'Show Summary'}
                                </button>
                                <button
                                    onClick={handleCloseChat}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="lg:col-span-3 flex flex-col min-h-0 p-4">
                            <div className="flex-1 min-h-0">
                                {activeChat && (
                                    activeChat.agentId ? (
                                        <WebSocketAdminChat
                                            sessionId={activeChat.sessionId}
                                            agentId={activeChat.agentId}
                                            onClose={handleCloseChat}
                                            showInterveneButton={false}
                                        />
                                    ) : (
                                        <WebSocketViewerChat
                                            sessionId={activeChat.sessionId}
                                            onEscalated={(agentId) => setActiveChat({ sessionId: activeChat.sessionId, agentId })}
                                            showInterveneButton={true}
                                        />
                                    )
                                )}
                            </div>
                        </div>

                        {/* Summary side panel */}
                        <div className={`lg:col-span-2 border-l border-white/20 p-4 ${summaryOpen ? 'hidden lg:block' : 'hidden'}`}>
                            <div className="sticky top-0 space-y-3">
                                <div className="text-white font-semibold">Conversation Summary</div>
                                <div className="bg-white/10 border border-white/20 rounded-xl p-3 max-h-[70vh] overflow-y-auto">
                                    {summaryLoading ? (
                                        <div className="text-white/60 text-sm">Loading summary…</div>
                                    ) : (
                                        <div className="text-white/80 text-sm whitespace-pre-wrap break-words">{activeSummary || 'No summary available.'}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
