'use client'

import type { UserResponse } from '@/lib/types'
import { AlertCircle, CheckCircle, Mail, Shield, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UserModalProps {
    isOpen: boolean
    onClose: () => void
    user?: UserResponse | null
    onSave: (userData: Partial<UserResponse>) => Promise<void>
    mode: 'create' | 'edit'
}

export default function UserModal({ isOpen, onClose, user, onSave, mode }: UserModalProps) {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        role: 'employee',
        is_active: true,
        is_verified: false
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (user && mode === 'edit') {
            setFormData({
                email: user.email,
                username: user.username,
                password: '',
                role: user.role,
                is_active: user.is_active,
                is_verified: user.is_verified
            })
        } else if (mode === 'create') {
            setFormData({
                email: '',
                username: '',
                password: '',
                role: 'employee',
                is_active: true,
                is_verified: false
            })
        }
    }, [user, mode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            if (mode === 'create' && !formData.password) {
                setError('Password is required for new users')
                return
            }

            const userData = mode === 'create' ? formData : {
                username: formData.username,
                is_active: formData.is_active,
                is_verified: formData.is_verified
            }

            await onSave(userData)
            setSuccess(`${mode === 'create' ? 'User created' : 'User updated'} successfully!`)

            // Close modal after a short delay
            setTimeout(() => {
                onClose()
            }, 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'create' ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                            <User className={`w-5 h-5 ${mode === 'create' ? 'text-green-600' : 'text-blue-600'
                                }`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {mode === 'create' ? 'Create New User' : 'Edit User'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {mode === 'create' ? 'Add a new user to the system' : 'Update user information'}
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={mode === 'edit'}
                                required
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder="user@example.com"
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    {mode === 'create' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                        </label>
                        <div className="relative">
                            <Shield className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <select
                                value={formData.role}
                                onChange={(e) => handleInputChange('role', e.target.value)}
                                disabled={mode === 'edit'}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Status Toggles */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Active Account</label>
                                <p className="text-xs text-gray-500">User can log in and access the system</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleInputChange('is_active', !formData.is_active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Email Verified</label>
                                <p className="text-xs text-gray-500">User's email has been verified</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleInputChange('is_verified', !formData.is_verified)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_verified ? 'bg-green-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_verified ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="text-red-800 text-sm">{error}</span>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-800 text-sm">{success}</span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${mode === 'create' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                                </>
                            ) : (
                                <>
                                    {mode === 'create' ? 'Create User' : 'Update User'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
