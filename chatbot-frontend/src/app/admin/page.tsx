'use client'

import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard'
import KnowledgeBaseManager from '@/components/admin/KnowledgeBaseManager'
import UserModal from '@/components/admin/UserModal'
import { WebSocketAdminChat } from '@/components/admin/WebSocketAdminChat'
import { AuthGuard } from '@/components/AuthGuard'
import { chatAPI } from '@/lib/api'
import type { EscalatedSession, UserResponse } from '@/lib/types'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Edit,
  Eye,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  User,
  Users
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function AdminPage() {
  const [escalatedSessions, setEscalatedSessions] = useState<EscalatedSession[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'users' | 'knowledge' | 'analytics'>('overview')
  const [activeChat, setActiveChat] = useState<{ sessionId: string; agentId: string } | null>(null)
  const [sessionSummaries, setSessionSummaries] = useState<Record<string, string>>({})
  const [summariesLoaded, setSummariesLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const fetchEscalatedSessions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await chatAPI.getEscalatedSessions()
      setEscalatedSessions(response.escalated_sessions)

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
  }, [summariesLoaded])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await chatAPI.getUsers()
      setUsers(response)
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchEscalatedSessions()
      const interval = setInterval(fetchEscalatedSessions, 30000)
      return () => clearInterval(interval)
    } else if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab, fetchEscalatedSessions, fetchUsers])

  const handleTakeSession = async (session: EscalatedSession) => {
    if (session.session_id) {
      try {
        await chatAPI.takeSession(session.agent_id)
        setActiveChat({
          sessionId: session.session_id,
          agentId: session.agent_id
        })
        fetchEscalatedSessions()
      } catch (err) {
        console.error('Error taking session:', err)
        setError('Failed to take session')
      }
    }
  }

  const handleCloseChat = () => {
    setActiveChat(null)
    setSummariesLoaded(false)
    fetchEscalatedSessions()
  }

  const handleCreateUser = () => {
    setModalMode('create')
    setEditingUser(null)
    setUserModalOpen(true)
  }

  const handleEditUser = (user: UserResponse) => {
    setModalMode('edit')
    setEditingUser(user)
    setUserModalOpen(true)
  }

  const handleSaveUser = async (userData: Partial<UserResponse>) => {
    try {
      if (modalMode === 'create') {
        // For now, we'll just refresh the users list
        // In a real implementation, you'd call an API to create the user
        console.log('Creating user:', userData)
      } else if (editingUser) {
        await chatAPI.updateUser(editingUser.id, userData)
      }
      fetchUsers()
    } catch (err) {
      console.error('Error saving user:', err)
      throw err
    }
  }

  const handleCloseUserModal = () => {
    setUserModalOpen(false)
    setEditingUser(null)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const getStats = () => {
    const totalUsers = users.length
    const adminUsers = users.filter(u => u.role === 'admin').length
    const employeeUsers = users.filter(u => u.role === 'employee').length
    const activeUsers = users.filter(u => u.is_active).length
    const waitingSessions = escalatedSessions.filter(s => s.status === 'waiting').length
    const activeSessions = escalatedSessions.filter(s => s.status === 'active').length

    return {
      totalUsers,
      adminUsers,
      employeeUsers,
      activeUsers,
      waitingSessions,
      activeSessions,
      totalSessions: escalatedSessions.length
    }
  }

  const stats = getStats()

  return (
    <AuthGuard roles={['admin']}>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <header className="bg-white shadow-sm border-b rounded-xl mb-6">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500">Manage your chatbot system</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Last updated</p>
                    <p className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border mb-6">
            <div className="border-b">
              <nav className="flex space-x-1 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'sessions', label: 'Sessions', icon: MessageSquare },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'knowledge', label: 'Knowledge', icon: Database },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 transition-all ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Admin Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-yellow-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Waiting Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.waitingSessions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="text-center">
                      <MessageSquare className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">Handle Sessions</p>
                      <p className="text-sm text-gray-500">Manage escalated conversations</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('users')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
                  >
                    <div className="text-center">
                      <Users className="w-8 h-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">Manage Users</p>
                      <p className="text-sm text-gray-500">Add, edit, or remove users</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('knowledge')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
                  >
                    <div className="text-center">
                      <Database className="w-8 h-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">Knowledge Base</p>
                      <p className="text-sm text-gray-500">Update content and documents</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {escalatedSessions.slice(0, 3).map((session) => (
                      <div key={session.agent_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Session {session.session_id?.slice(-8) || 'Unknown'} escalated
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.escalated_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleTakeSession(session)}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Take
                        </button>
                      </div>
                    ))}
                    {escalatedSessions.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Escalated</p>
                      <p className="text-2xl font-bold text-gray-900">{escalatedSessions.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-yellow-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Waiting</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {escalatedSessions.filter(s => s.status === 'waiting').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
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
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Escalated Sessions</h2>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading escalated sessions...
                    </div>
                  </div>
                ) : error ? (
                  <div className="p-6 text-center text-red-500">
                    {error}
                  </div>
                ) : escalatedSessions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium">No escalated sessions</p>
                    <p className="text-sm">All customer conversations are being handled automatically</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {escalatedSessions.map((session) => (
                      <div key={session.agent_id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                              <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  Session {session.session_id?.slice(-8) || 'Unknown'}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${session.status === 'waiting'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                                  }`}>
                                  {session.status === 'waiting' ? 'Waiting' : 'Active'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Agent ID:</span> {session.agent_id}
                                </div>
                                <div>
                                  <span className="font-medium">Messages:</span> {session.message_count}
                                </div>
                                <div>
                                  <span className="font-medium">Escalated:</span> {new Date(session.escalated_at).toLocaleString()}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span> {session.status}
                                </div>
                              </div>

                              {/* Conversation Summary */}
                              {session.session_id && sessionSummaries[session.session_id] && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <h4 className="text-sm font-medium text-blue-900 mb-2">Conversation Summary:</h4>
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
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Take Session
                            </button>
                            <button
                              onClick={() => window.open(`/?session=${session.session_id || ''}`, '_blank')}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
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
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Header with Search and Add User */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                  <button
                    onClick={handleCreateUser}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add User
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Users ({filteredUsers.length})</h3>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium">No users found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${user.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                              <User className={`w-6 h-6 ${user.role === 'admin' ? 'text-red-600' : 'text-blue-600'
                                }`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{user.username}</h3>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {user.role}
                                </span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_verified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {user.is_verified ? 'Verified' : 'Unverified'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBaseManager />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              escalatedSessions={escalatedSessions}
              users={users}
            />
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

        {/* User Management Modal */}
        <UserModal
          isOpen={userModalOpen}
          onClose={handleCloseUserModal}
          user={editingUser}
          onSave={handleSaveUser}
          mode={modalMode}
        />
      </main>
    </AuthGuard>
  )
} 