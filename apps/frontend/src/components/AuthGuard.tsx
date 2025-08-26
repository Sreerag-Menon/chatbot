"use client"

import { useRequireRole } from '@/lib/auth'

export function AuthGuard({
    children,
    roles,
}: {
    children: React.ReactNode
    roles: Array<'admin' | 'employee'>
}) {
    // This will redirect away if not permitted
    useRequireRole(roles)
    return <>{children}</>
}



