'use client'

import { chatAPI } from '@/lib/api'
import type { IndexedDocument, KnowledgeBaseStats } from '@/lib/types'
import {
    AlertCircle,
    CheckCircle,
    Database,
    FileText,
    Loader2,
    RefreshCw,
    Trash2,
    Upload
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function KnowledgeBaseManager() {
    const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)
    const [documents, setDocuments] = useState<IndexedDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [crawling, setCrawling] = useState(false)
    const [crawlStatus, setCrawlStatus] = useState<any>(null)
    const [error, setError] = useState<string>()
    const [success, setSuccess] = useState<string>()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Helper function to safely get updated_at from metadata
    const getUpdatedAt = (metadata: Record<string, unknown>): string | null => {
        const updatedAt = metadata.updated_at
        return typeof updatedAt === 'string' ? updatedAt : null
    }

    const fetchStats = async () => {
        try {
            setLoading(true)
            const response = await chatAPI.getKnowledgeBaseStatus()
            if (response.status === 'success') {
                setStats(response.data)
            } else {
                setError('Failed to load knowledge base status')
            }
        } catch (err) {
            console.error('Error fetching stats:', err)
            setError('Failed to load knowledge base status')
        } finally {
            setLoading(false)
        }
    }

    const fetchDocuments = async () => {
        try {
            const response = await chatAPI.getIndexedDocuments()
            if (response.status === 'success') {
                setDocuments(response.data)
            }
        } catch (err) {
            console.error('Error fetching documents:', err)
        }
    }

    useEffect(() => {
        fetchStats()
        fetchDocuments()
        fetchCrawlStatus()
    }, [])

    const handleForceUpdate = async () => {
        try {
            setUpdating(true)
            setError(undefined)
            setSuccess(undefined)

            const response = await chatAPI.forceUpdateWebsite()
            if (response.status === 'success') {
                setSuccess(response.message)
                await fetchStats()
                await fetchDocuments()
            } else {
                setError(response.message)
            }
        } catch (err) {
            console.error('Error updating website:', err)
            setError('Failed to update website')
        } finally {
            setUpdating(false)
        }
    }

    const handleComprehensiveCrawl = async () => {
        try {
            setCrawling(true)
            setError(undefined)
            setSuccess(undefined)

            const response = await chatAPI.crawlWebsiteComprehensive()
            if (response.status === 'success') {
                setSuccess(response.message)
                await fetchStats()
                await fetchDocuments()
            } else {
                setError(response.message)
            }
        } catch (err) {
            console.error('Error crawling website:', err)
            setError('Failed to crawl website')
        } finally {
            setCrawling(false)
        }
    }

    const fetchCrawlStatus = async () => {
        try {
            const response = await chatAPI.getCrawlStatus()
            if (response.status === 'success') {
                setCrawlStatus(response.data)
            }
        } catch (err) {
            console.error('Error fetching crawl status:', err)
        }
    }

    const handleFileUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file')
            return
        }

        try {
            setUploading(true)
            setError(undefined)
            setSuccess(undefined)

            const response = await chatAPI.uploadPDF(selectedFile)
            if (response.status === 'success') {
                setSuccess(response.message)
                setSelectedFile(null)
                await fetchStats()
                await fetchDocuments()
            } else {
                setError(response.message)
            }
        } catch (err) {
            console.error('Error uploading file:', err)
            setError('Failed to upload file')
        } finally {
            setUploading(false)
        }
    }

    const handleClearKnowledgeBase = async () => {
        if (!confirm('Are you sure you want to clear the entire knowledge base? This action cannot be undone.')) {
            return
        }

        try {
            setUpdating(true)
            setError(undefined)
            setSuccess(undefined)

            const response = await chatAPI.clearKnowledgeBase()
            if (response.status === 'success') {
                setSuccess(response.message)
                await fetchStats()
                await fetchDocuments()
            } else {
                setError(response.message)
            }
        } catch (err) {
            console.error('Error clearing knowledge base:', err)
            setError('Failed to clear knowledge base')
        } finally {
            setUpdating(false)
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file)
            setError(undefined)
        } else if (file) {
            setError('Please select a PDF file')
            setSelectedFile(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Knowledge Base Management</h2>
                        <p className="text-sm text-gray-500">Manage website content and PDF documents</p>
                    </div>
                </div>

                {/* Status Cards */}
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        <span className="ml-2 text-gray-500">Loading knowledge base status...</span>
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">Total Documents</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">Sources</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.sources).length}</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-gray-600">Status</span>
                            </div>
                            <p className="text-sm font-medium text-green-600">Active</p>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Force Update Website */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <RefreshCw className="w-5 h-5 text-blue-600" />
                            <h4 className="font-medium text-gray-900">Re-scrape Website</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                            Force update the knowledge base with latest website content
                        </p>
                        <button
                            onClick={handleForceUpdate}
                            disabled={updating}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {updating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Update Website
                                </>
                            )}
                        </button>
                    </div>

                    {/* Comprehensive Website Crawling */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Database className="w-5 h-5 text-purple-600" />
                            <h4 className="font-medium text-gray-900">Comprehensive Crawl</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                            Crawl entire website for comprehensive knowledge base setup
                        </p>
                        <button
                            onClick={handleComprehensiveCrawl}
                            disabled={crawling}
                            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {crawling ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Crawling...
                                </>
                            ) : (
                                <>
                                    <Database className="w-4 h-4" />
                                    Start Crawl
                                </>
                            )}
                        </button>
                    </div>

                    {/* Upload PDF */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Upload className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-gray-900">Upload PDF</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                            Add PDF documents to the knowledge base
                        </p>
                        <div className="space-y-2">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {selectedFile && (
                                <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                            )}
                            <button
                                onClick={handleFileUpload}
                                disabled={!selectedFile || uploading}
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Clear Knowledge Base */}
                <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-3 mb-3">
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <h4 className="font-medium text-gray-900">Danger Zone</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                        Clear all documents from the knowledge base. This action cannot be undone.
                    </p>
                    <button
                        onClick={handleClearKnowledgeBase}
                        disabled={updating}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {updating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Clearing...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Clear Knowledge Base
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800">{success}</span>
                    </div>
                </div>
            )}

            {/* Crawl Status */}
            {crawlStatus && (
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Crawling Configuration & Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Website Configuration</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Website URL:</span>
                                    <span className="font-mono text-gray-800">{crawlStatus.website_url}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Last Scraped Hash:</span>
                                    <span className="font-mono text-gray-800">
                                        {crawlStatus.last_scraped_hash ?
                                            crawlStatus.last_scraped_hash.substring(0, 8) + '...' :
                                            'None'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Documents:</span>
                                    <span className="font-semibold text-gray-800">{crawlStatus.total_documents}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Crawling Settings</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Max Pages:</span>
                                    <span className="font-semibold text-gray-800">{crawlStatus.crawl_config.max_pages}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Delay:</span>
                                    <span className="font-semibold text-gray-800">{crawlStatus.crawl_config.delay_seconds}s</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subdomains:</span>
                                    <span className="font-semibold text-gray-800">
                                        {crawlStatus.crawl_config.allow_subdomains ? 'Allowed' : 'Blocked'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">User Agent:</span>
                                    <span className="font-mono text-gray-800 text-xs">
                                        {crawlStatus.crawl_config.user_agent}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents List */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Indexed Documents</h3>
                </div>

                {documents.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        No documents indexed yet.
                    </div>
                ) : (
                    <div className="divide-y">
                        {documents.map((doc) => (
                            <div key={doc.id} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{doc.source}</h4>
                                        <p className="text-sm text-gray-500 mt-1">{doc.content_preview}</p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-xs text-gray-400">ID: {doc.id}</span>
                                            {getUpdatedAt(doc.metadata) && (
                                                <span className="text-xs text-gray-400">
                                                    Updated: {new Date(getUpdatedAt(doc.metadata)!).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
} 