"use client"

import { WebSocketChatWindow } from '@/components/chat/WebSocketChatWindow'

export default function WidgetPage() {
    return (
        <main className="relative min-h-screen antialiased overflow-hidden">
            {/* Ambient gradient background */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-700 via-indigo-700 to-cyan-600" />

            <div className="relative z-10 h-screen flex flex-col">
                <WebSocketChatWindow />
            </div>
        </main>
    )
}


