'use client'

import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard'
import KnowledgeBaseManager from '@/components/admin/KnowledgeBaseManager'
import UserModal from '@/components/admin/UserModal'
import { WebSocketAdminChat } from '@/components/admin/WebSocketAdminChat'
import { AuthGuard } from '@/components/AuthGuard'
import { chatAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { EscalatedSession, UserResponse } from '@/lib/types'
import {
  Activity,
  Clock,
  Database,
  Edit,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Shield,
  TrendingUp,
  User,
  Users
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type TabType = 'overview' | 'sessions' | 'users' | 'knowledge' | 'analytics' | 'bot-testing'

interface TabConfig {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: Home, description: 'System overview and key metrics' },
  { id: 'sessions', label: 'Sessions', icon: MessageSquare, description: 'Manage escalated chat sessions' },
  { id: 'users', label: 'Users', icon: Users, description: 'Manage system users and permissions' },
  { id: 'knowledge', label: 'Knowledge Base', icon: Database, description: 'Manage content and documents' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Detailed analytics and reports' },
  { id: 'bot-testing', label: 'Bot Testing', icon: MessageSquare, description: 'Test bot responses and accuracy' }
]

export default function AdminPage() {
  const { logout } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [users, setUsers] = useState<UserResponse[]>([])
  const [escalatedSessions, setEscalatedSessions] = useState<EscalatedSession[]>([])
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)

  // Bot testing state
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    content: string
    isBot: boolean
    timestamp: Date
    confidence?: number
    responseTime?: number
  }>>([
    {
      id: '1',
      content: "Hello! I'm the chatbot. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
      confidence: 0.95,
      responseTime: 150
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatMetrics, setChatMetrics] = useState({
    totalTests: 0,
    averageResponseTime: 0,
    averageConfidence: 0,
    accuracyRating: 'N/A'
  })
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState<{ sessionId: string; agentId: string } | null>(null)
  const [sessionSummaries, setSessionSummaries] = useState<Record<string, string>>({})
  const [summariesLoaded, setSummariesLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [userModalOpen, setUserModalOpen] = useState(false)

  const fetchEscalatedSessions = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('chatbot_auth_token') : null
      if (!token) return
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
      // setError('Failed to load escalated sessions') // This line was removed
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('chatbot_auth_token') : null
      if (!token) return
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
        // setError('Failed to take session') // This line was removed
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

  type CreateUserPayload = {
    email: string
    username: string
    password: string
    role: string
    is_active?: boolean
    is_verified?: boolean
  }

  const handleSaveUser = async (userData: Partial<UserResponse>) => {
    try {
      if (modalMode === 'create') {
        const createUserData: CreateUserPayload = {
          email: userData.email as string,
          username: userData.username as string,
          password: (userData as { password?: string }).password || '',
          role: (userData.role as string) || 'employee',
          is_active: userData.is_active ?? true,
          is_verified: userData.is_verified ?? false,
        };
        await chatAPI.createUser(createUserData);
      } else if (editingUser) {
        await chatAPI.updateUser(editingUser.id, userData)
      }
      fetchUsers()
    } catch (err) {
      console.error('Error saving user:', err)
      throw err
    }
  }

  // Bot testing functions
  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      content: message,
      isBot: false,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsChatLoading(true)

    try {
      // Call the real bot testing API
      const startTime = Date.now()
      const response = await chatAPI.testBotMessage(message)
      const responseTime = Date.now() - startTime

      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: response.bot_response || 'No response received',
        isBot: true,
        timestamp: new Date(),
        confidence: response.confidence_score || 0.0,
        responseTime
      }

      setChatMessages(prev => [...prev, botMessage])

      // Update metrics
      const newTotalTests = chatMetrics.totalTests + 1
      const newAvgResponseTime = (chatMetrics.averageResponseTime * chatMetrics.totalTests + responseTime) / newTotalTests
      const newAvgConfidence = (chatMetrics.averageConfidence * chatMetrics.totalTests + (response.confidence_score || 0.0)) / newTotalTests

      setChatMetrics({
        totalTests: newTotalTests,
        averageResponseTime: Math.round(newAvgResponseTime),
        averageConfidence: Math.round(newAvgConfidence * 100) / 100,
        accuracyRating: newAvgConfidence > 0.8 ? 'High' : newAvgConfidence > 0.6 ? 'Medium' : 'Low'
      })
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your message. Please try again.',
        isBot: true,
        timestamp: new Date(),
        confidence: 0,
        responseTime: 0
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const clearChat = () => {
    setChatMessages([{
      id: '1',
      content: "Hello! I'm the chatbot. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
      confidence: 0.95,
      responseTime: 150
    }])
    setChatMetrics({
      totalTests: 0,
      averageResponseTime: 0,
      averageConfidence: 0,
      accuracyRating: 'N/A'
    })
  }

  const handleChatInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage(chatInput)
    }
  }

  const runAccuracyTest = async () => {
    const testCases = [
      { message: "What are your business hours?", test_category: "general" },
      { message: "How can I contact support?", test_category: "support" },
      { message: "What services do you offer?", test_category: "services" },
      { message: "How do I reset my password?", test_category: "technical" }
    ]

    try {
      setIsChatLoading(true)
      const result = await chatAPI.runAccuracyTest(testCases, "Standard Accuracy Test", "Testing bot responses to common queries")

      // Update metrics with test results
      setChatMetrics({
        totalTests: result.total_tests || 0,
        averageResponseTime: result.average_response_time || 0,
        averageConfidence: result.average_confidence || 0,
        accuracyRating: result.accuracy_percentage >= 80 ? 'High' : result.accuracy_percentage >= 60 ? 'Medium' : 'Low'
      })

      // Add test results to chat
      const testSummary = {
        id: Date.now().toString(),
        content: `Accuracy test completed: ${result.passed_tests}/${result.total_tests} tests passed. Overall accuracy: ${result.accuracy_percentage || 0}%`,
        isBot: true,
        timestamp: new Date(),
        confidence: result.average_confidence || 0,
        responseTime: result.average_response_time || 0
      }

      setChatMessages(prev => [...prev, testSummary])
    } catch (error) {
      console.error('Error running accuracy test:', error)
      const errorMessage = {
        id: Date.now().toString(),
        content: 'Error running accuracy test. Please check the console for details.',
        isBot: true,
        timestamp: new Date(),
        confidence: 0,
        responseTime: 0
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const exportTestResults = () => {
    const testData = {
      timestamp: new Date().toISOString(),
      metrics: chatMetrics,
      messages: chatMessages,
      totalTests: chatMetrics.totalTests
    }

    const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bot-test-results-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Total Users</p>
                    <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-white/60" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Active Sessions</p>
                    <p className="text-3xl font-bold text-white">{stats.activeSessions}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-white/60" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Waiting Sessions</p>
                    <p className="text-3xl font-bold text-white">{stats.waitingSessions}</p>
                  </div>
                  <Clock className="w-8 h-8 text-white/60" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Admin Users</p>
                    <p className="text-3xl font-bold text-white">{stats.adminUsers}</p>
                  </div>
                  <Shield className="w-8 h-8 text-white/60" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white/80">
                  <Activity className="w-4 h-4" />
                  <span>System is running normally</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <Users className="w-4 h-4" />
                  <span>{stats.totalUsers} users registered</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <MessageSquare className="w-4 h-4" />
                  <span>{stats.totalSessions} total sessions</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'sessions':
        return (
          <div className="space-y-6">
            {activeChat ? (
              <WebSocketAdminChat
                sessionId={activeChat.sessionId}
                agentId={activeChat.agentId}
                onClose={handleCloseChat}
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Escalated Sessions</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">
                      {stats.waitingSessions} waiting, {stats.activeSessions} active
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/70">Loading sessions...</p>
                  </div>
                ) : escalatedSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/70">No escalated sessions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {escalatedSessions.map((session) => (
                      <div
                        key={session.agent_id}
                        className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-white">
                                Session: {session.session_id}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${session.status === 'waiting'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-green-500/20 text-green-300'
                                }`}>
                                {session.status === 'waiting' ? 'Waiting' : 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/70">
                              <span>Agent: {session.agent_id}</span>
                              <span>Messages: {session.message_count}</span>
                              <span>Escalated: {new Date(session.escalated_at).toLocaleString()}</span>
                            </div>
                            {sessionSummaries[session.session_id] && (
                              <p className="text-sm text-white/60 mt-2 line-clamp-2">
                                {sessionSummaries[session.session_id]}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTakeSession(session)}
                              className="px-3 py-1.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform"
                            >
                              Take Session
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">User Management</h3>
                <button
                  onClick={handleCreateUser}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-medium rounded-lg hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  Create User
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{user.username}</h4>
                        <p className="text-sm text-white/70">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-blue-500/20 text-blue-300'
                          }`}>
                          {user.role}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-gray-500/20 text-gray-300'
                          }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_verified
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'knowledge':
        return <KnowledgeBaseManager />

      case 'analytics':
        return <AnalyticsDashboard escalatedSessions={escalatedSessions} users={users} />

      case 'bot-testing':
        return (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Bot Testing & Accuracy Check</h3>
              <p className="text-white/70 mb-6">Test the chatbot with various queries to evaluate response quality and accuracy.</p>

              <div className="space-y-4">
                {/* Chat Interface */}
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 h-96 flex flex-col">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div className={`bg-white/10 rounded-lg p-3 max-w-[80%] ${msg.isBot ? 'bg-white/10' : 'bg-fuchsia-500/20'}`}>
                          <p className="text-white text-sm">{msg.content}</p>
                          <p className="text-white/50 text-xs mt-2">
                            {msg.isBot ? 'Bot' : 'You'} • {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Type your message to test the bot..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleChatInputKeyPress}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                    <button
                      onClick={() => sendChatMessage(chatInput)}
                      className="px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-medium rounded-lg hover:scale-105 transition-transform"
                      disabled={isChatLoading}
                    >
                      {isChatLoading ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>

                {/* Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                    <h5 className="font-medium text-white mb-2">Response Time</h5>
                    <p className="text-2xl font-bold text-white">
                      {chatMetrics.totalTests > 0 ? `${chatMetrics.averageResponseTime}ms` : '0ms'}
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                    <h5 className="font-medium text-white mb-2">Confidence Score</h5>
                    <p className="text-2xl font-bold text-white">
                      {chatMetrics.totalTests > 0 ? chatMetrics.averageConfidence.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                    <h5 className="font-medium text-white mb-2">Accuracy Rating</h5>
                    <p className="text-2xl font-bold text-white">{chatMetrics.accuracyRating}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                    <h5 className="font-medium text-white mb-2">Total Tests</h5>
                    <p className="text-2xl font-bold text-white">{chatMetrics.totalTests}</p>
                  </div>
                </div>

                {/* Test Controls */}
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                  <h4 className="font-medium text-white mb-3">Test Controls</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={clearChat}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                    >
                      Clear Chat
                    </button>
                    <button
                      onClick={exportTestResults}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                    >
                      Export Test Results
                    </button>
                    <button
                      onClick={runAccuracyTest}
                      disabled={isChatLoading}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChatLoading ? 'Running...' : 'Run Accuracy Test'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <AuthGuard roles={['admin']}>
      <main className="relative min-h-screen antialiased overflow-hidden">
        {/* Animated gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-700 via-indigo-700 to-cyan-600" />

        {/* Ambient blobs */}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />

        <div className="relative z-10 flex min-h-screen">
          {/* Sidebar */}
          <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white/10 backdrop-blur-xl border-r border-white/20 transition-all duration-300`}>
            <div className="p-6">
              {/* Header with Logout */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  {!sidebarCollapsed && (
                    <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                  )}
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      title={sidebarCollapsed ? tab.description : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <div className="text-left">
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-xs opacity-70">{tab.description}</div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </nav>

              {/* Logout Section */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title={sidebarCollapsed ? "Logout" : undefined}
                >
                  <LogOut className="w-5 h-5" />
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <div className="font-medium">Logout</div>
                      <div className="text-xs opacity-70">Sign out of your account</div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-8">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                <p className="text-white/70">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>

              {/* Tab Content */}
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* User Modal */}
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