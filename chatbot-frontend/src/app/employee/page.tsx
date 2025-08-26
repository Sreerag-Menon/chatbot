"use client"

import { AuthGuard } from '@/components/AuthGuard'
import { WebSocketAdminChat } from '@/components/admin/WebSocketAdminChat'
import { chatAPI } from '@/lib/api'
import type { EscalatedSession } from '@/lib/types'
import { AlertTriangle, Clock, MessageSquare, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function EmployeePage() {
    const [escalatedSessions, setEscalatedSessions] = useState<EscalatedSession[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>()
    const [activeChat, setActiveChat] = useState<{ sessionId: string; agentId: string } | null>(null)

    const fetchEscalatedSessions = useCallback(async () => {
        try {
            setLoading(true)
            const response = await chatAPI.getEscalatedSessions()
            setEscalatedSessions(response.escalated_sessions)
        } catch (err) {
            console.error('Error fetching escalated sessions:', err)
            setError('Failed to load escalated sessions')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchEscalatedSessions()
        const interval = setInterval(fetchEscalatedSessions, 30000)
        return () => clearInterval(interval)
    }, [fetchEscalatedSessions])

    const handleTakeSession = async (session: EscalatedSession) => {
        if (!session.session_id) return
        try {
            await chatAPI.takeSession(session.agent_id)
            setActiveChat({ sessionId: session.session_id, agentId: session.agent_id })
            fetchEscalatedSessions()
        } catch (err) {
            console.error('Error taking session:', err)
            setError('Failed to take session')
        }
    }

    const handleCloseChat = () => {
        setActiveChat(null)
        fetchEscalatedSessions()
    }

    return (
        <AuthGuard roles={['employee', 'admin']}>
            <main className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto p-6">
                    <header className="bg-white shadow-sm border-b rounded-lg mb-6">
                        <div className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <h1 className="text-xl font-bold text-gray-900">Employee Dashboard</h1>
                                </div>
                                <div className="text-sm text-gray-500">Escalated Sessions: {escalatedSessions.length}</div>
                            </div>
                        </div>
                    </header>

                    <div className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Escalated</p>
                                        <p className="text-2xl font-bold text-gray-900">{escalatedSessions.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Waiting</p>
                                        <p className="text-2xl font-bold text-gray-900">{escalatedSessions.filter(s => s.status === 'waiting').length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <User className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Active</p>
                                        <p className="text-2xl font-bold text-gray-900">{escalatedSessions.filter(s => s.status === 'active').length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="px-6 py-4 border-b">
                                <h2 className="text-lg font-semibold text-gray-900">Escalated Sessions</h2>
                            </div>

                            {loading ? (
                                <div className="p-6 text-center text-gray-500">Loading escalated sessions...</div>
                            ) : error ? (
                                <div className="p-6 text-center text-red-500">{error}</div>
                            ) : escalatedSessions.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No escalated sessions at the moment.</div>
                            ) : (
                                <div className="divide-y">
                                    {escalatedSessions.map((session) => (
                                        <div key={session.agent_id} className="p-6 hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-medium text-gray-900">Session {session.session_id?.slice(-8) || 'Unknown'}</h3>
                                                        <p className="text-sm text-gray-500">Agent ID: {session.agent_id}</p>
                                                        <p className="text-sm text-gray-500">Messages: {session.message_count}</p>
                                                        <p className="text-sm text-gray-500">Escalated: {new Date(session.escalated_at).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <button
                                                        onClick={() => handleTakeSession(session)}
                                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                    >
                                                        Take Session
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(`/?session=${session.session_id || ''}`, '_blank')}
                                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
                </div>

                {activeChat && (
                    <WebSocketAdminChat
                        sessionId={activeChat.sessionId}
                        agentId={activeChat.agentId}
                        onClose={handleCloseChat}
                    />
                )}
            </main>
        </AuthGuard>
    )
}



