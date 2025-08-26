'use client'

import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    MessageSquare,
    Target,
    TrendingUp,
    Users
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface AnalyticsData {
    totalUsers: number
    adminUsers: number
    employeeUsers: number
    activeUsers: number
    waitingSessions: number
    activeSessions: number
    totalSessions: number
    escalatedSessions: number
    resolvedSessions: number
    averageResponseTime: number
    customerSatisfaction: number
}

interface AnalyticsDashboardProps {
    escalatedSessions: any[]
    users: any[]
}

export default function AnalyticsDashboard({ escalatedSessions, users }: AnalyticsDashboardProps) {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
        totalUsers: 0,
        adminUsers: 0,
        employeeUsers: 0,
        activeUsers: 0,
        waitingSessions: 0,
        activeSessions: 0,
        totalSessions: 0,
        escalatedSessions: 0,
        resolvedSessions: 0,
        averageResponseTime: 0,
        customerSatisfaction: 0
    })

    useEffect(() => {
        if (escalatedSessions && users) {
            const totalUsers = users.length
            const adminUsers = users.filter(u => u.role === 'admin').length
            const employeeUsers = users.filter(u => u.role === 'employee').length
            const activeUsers = users.filter(u => u.is_active).length
            const waitingSessions = escalatedSessions.filter(s => s.status === 'waiting').length
            const activeSessions = escalatedSessions.filter(s => s.status === 'active').length
            const totalSessions = escalatedSessions.length
            const escalatedSessionsCount = escalatedSessions.length
            const resolvedSessions = escalatedSessions.filter(s => s.status === 'completed').length

            setAnalyticsData({
                totalUsers,
                adminUsers,
                employeeUsers,
                activeUsers,
                waitingSessions,
                activeSessions,
                totalSessions,
                escalatedSessions: escalatedSessionsCount,
                resolvedSessions,
                averageResponseTime: 2.5, // Mock data - in real app, calculate from actual data
                customerSatisfaction: 4.2 // Mock data - in real app, calculate from actual data
            })
        }
    }, [escalatedSessions, users])

    const getStatusColor = (value: number, threshold: number) => {
        if (value >= threshold) return 'text-green-600'
        if (value >= threshold * 0.7) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getStatusIcon = (value: number, threshold: number) => {
        if (value >= threshold) return <CheckCircle className="w-5 h-5 text-green-600" />
        if (value >= threshold * 0.7) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
        return <AlertTriangle className="w-5 h-5 text-red-600" />
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.totalUsers}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Active Sessions</p>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.activeSessions}</p>
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
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.waitingSessions}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Resolved</p>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.resolvedSessions}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Average Response Time</p>
                                    <p className="text-xs text-gray-500">Time to first response</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-bold ${getStatusColor(analyticsData.averageResponseTime, 3)}`}>
                                    {analyticsData.averageResponseTime}m
                                </p>
                                {getStatusIcon(analyticsData.averageResponseTime, 3)}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Target className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Customer Satisfaction</p>
                                    <p className="text-xs text-gray-500">Average rating (1-5)</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-bold ${getStatusColor(analyticsData.customerSatisfaction, 4)}`}>
                                    {analyticsData.customerSatisfaction}/5
                                </p>
                                {getStatusIcon(analyticsData.customerSatisfaction, 4)}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Session Resolution Rate</p>
                                    <p className="text-xs text-gray-500">Successfully resolved sessions</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-bold ${getStatusColor(analyticsData.resolvedSessions, analyticsData.totalSessions * 0.8)}`}>
                                    {analyticsData.totalSessions > 0 ? Math.round((analyticsData.resolvedSessions / analyticsData.totalSessions) * 100) : 0}%
                                </p>
                                {getStatusIcon(analyticsData.resolvedSessions, analyticsData.totalSessions * 0.8)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-4 h-4 text-red-600" />
                                </div>
                                <span className="text-sm text-gray-700">Admin Users</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${analyticsData.totalUsers > 0 ? (analyticsData.adminUsers / analyticsData.totalUsers) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{analyticsData.adminUsers}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm text-gray-700">Employee Users</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${analyticsData.totalUsers > 0 ? (analyticsData.employeeUsers / analyticsData.totalUsers) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{analyticsData.employeeUsers}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-sm text-gray-700">Active Users</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${analyticsData.totalUsers > 0 ? (analyticsData.activeUsers / analyticsData.totalUsers) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{analyticsData.activeUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Chart */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{analyticsData.totalSessions}</p>
                        <p className="text-sm text-gray-500">Total Sessions</p>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{analyticsData.escalatedSessions}</p>
                        <p className="text-sm text-gray-500">Escalated</p>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{analyticsData.resolvedSessions}</p>
                        <p className="text-sm text-gray-500">Resolved</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group">
                        <div className="text-center">
                            <BarChart3 className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                            <p className="font-medium text-gray-900">Export Report</p>
                            <p className="text-sm text-gray-500">Download analytics data</p>
                        </div>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group">
                        <div className="text-center">
                            <TrendingUp className="w-8 h-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                            <p className="font-medium text-gray-900">Performance Review</p>
                            <p className="text-sm text-gray-500">Analyze team performance</p>
                        </div>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group">
                        <div className="text-center">
                            <Calendar className="w-8 h-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                            <p className="font-medium text-gray-900">Schedule Report</p>
                            <p className="text-sm text-gray-500">Set up automated reports</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
