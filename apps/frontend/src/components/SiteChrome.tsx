"use client"

import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { user, logout, isLoading } = useAuth()

    return (
        <div>
            <header className="w-full border-b bg-white">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <nav className="flex items-center gap-4 text-sm">
                        <Link href="/" className={linkCls(pathname === '/')}>Home</Link>
                        <Link href="/employee" className={linkCls(pathname?.startsWith('/employee'))}>Employee</Link>
                        <Link href="/admin" className={linkCls(pathname?.startsWith('/admin'))}>Admin</Link>
                    </nav>
                    <div className="text-sm flex items-center gap-3">
                        {!isLoading && (
                            <>
                                {user?.role ? (
                                    <>
                                        <span className="text-gray-600">Signed in as <b>{user.username}</b> ({user.role})</span>
                                        <button onClick={logout} className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">Logout</button>
                                    </>
                                ) : (
                                    <Link href="/login" className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700">Login</Link>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>
            {children}
        </div>
    )
}

function linkCls(active?: boolean) {
    return active ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
}



