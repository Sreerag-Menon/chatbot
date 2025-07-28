'use client'

import KnowledgeBaseManager from '@/components/admin/KnowledgeBaseManager'
import { WebSocketAdminChat } from '@/components/admin/WebSocketAdminChat'
import { chatAPI } from '@/lib/api'
import type { EscalatedSession } from '@/lib/types'
import { AlertTriangle, Clock, Database, MessageSquare, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [escalatedSessions, setEscalatedSessions] = useState<EscalatedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [activeTab, setActiveTab] = useState<'sessions' | 'knowledge'>('sessions')
  const [activeChat, setActiveChat] = useState<{ sessionId: string; agentId: string } | null>(null)
  const [sessionSummaries, setSessionSummaries] = useState<Record<string, string>>({})
  const [summariesLoaded, setSummariesLoaded] = useState(false)

  const fetchEscalatedSessions = async () => {
    try {
      setLoading(true)
      const response = await chatAPI.getEscalatedSessions()
      setEscalatedSessions(response.escalated_sessions)

      // Fetch summaries for all sessions (only if not already loaded)
      if (!summariesLoaded) {
        const summaries: Record<string, string> = {}
        for (const session of response.escalated_sessions) {
          if (session.session_id) {
            try {
              const summaryResponse = await chatAPI.getSessionSummary(session.session_id)
              if (summaryResponse.status === 'success') {
                summaries[session.session_id] = summaryResponse.summary
              }
            } catch (err) {
              console.error(`Error fetching summary for session ${session.session_id}:`, err)
            }
          }
        }
        setSessionSummaries(summaries)
        setSummariesLoaded(true)
      }
    } catch (err) {
      console.error('Error fetching escalated sessions:', err)
      setError('Failed to load escalated sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchEscalatedSessions()

      // Refresh every 30 seconds only for sessions tab
      const interval = setInterval(fetchEscalatedSessions, 30000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const handleTakeSession = async (session: EscalatedSession) => {
    if (session.session_id) {
      try {
        // Mark the session as taken
        const result = await chatAPI.takeSession(session.agent_id)

        // Open the chat window
        setActiveChat({
          sessionId: session.session_id,
          agentId: session.agent_id
        })

        // Refresh the sessions list
        fetchEscalatedSessions()
      } catch (err) {
        console.error('Error taking session:', err)
        setError('Failed to take session')
      }
    }
  }

  const handleCloseChat = () => {
    setActiveChat(null)
    setSummariesLoaded(false) // Reset to allow fresh summaries for new sessions
    fetchEscalatedSessions()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <header className="bg-white shadow-sm border-b rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
              <div className="text-sm text-gray-500">
                {activeTab === 'sessions' && `Escalated Sessions: ${escalatedSessions.length}`}
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
                Escalated Sessions
              </button>
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'knowledge'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Database className="w-4 h-4" />
                Knowledge Base
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'sessions' ? (
          <div className="grid gap-6">
            {/* Stats Cards */}
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
                    <p className="text-2xl font-bold text-gray-900">
                      {escalatedSessions.filter(s => s.status === 'waiting').length}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-900">
                      {escalatedSessions.filter(s => s.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Escalated Sessions List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Escalated Sessions</h2>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-500">
                  Loading escalated sessions...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  {error}
                </div>
              ) : escalatedSessions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No escalated sessions at the moment.
                </div>
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
                            <h3 className="font-medium text-gray-900">
                              Session {session.session_id?.slice(-8) || 'Unknown'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Agent ID: {session.agent_id}
                            </p>
                            <p className="text-sm text-gray-500">
                              Messages: {session.message_count}
                            </p>
                            <p className="text-sm text-gray-500">
                              Escalated: {new Date(session.escalated_at).toLocaleString()}
                            </p>

                            {/* Conversation Summary */}
                            {session.session_id && sessionSummaries[session.session_id] && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 mb-1">Conversation Summary:</h4>
                                <p className="text-sm text-blue-800 leading-relaxed">
                                  {sessionSummaries[session.session_id].length > 200
                                    ? `${sessionSummaries[session.session_id].substring(0, 200)}...`
                                    : sessionSummaries[session.session_id]
                                  }
                                </p>
                              </div>
                            )}
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
        ) : (
          <KnowledgeBaseManager />
        )}
      </div>

      {/* Admin Chat Window */}
      {activeChat && (
        <WebSocketAdminChat
          sessionId={activeChat.sessionId}
          agentId={activeChat.agentId}
          onClose={handleCloseChat}
        />
      )}
    </main>
  )
} 