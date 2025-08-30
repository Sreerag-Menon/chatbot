import { WebSocketChatWindow } from '@/components/chat/WebSocketChatWindow'

export default function Home() {
  return (
    <main className="relative min-h-screen antialiased overflow-hidden">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-700 via-indigo-700 to-cyan-600" />

      <div className="relative z-10 max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-xl border-b border-white/20">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <h1 className="text-xl font-bold text-white">SupportSages Chat</h1>
              </div>
              <div className="text-sm text-white/70">
                Customer Support
              </div>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          <WebSocketChatWindow />
        </div>
      </div>
    </main>
  )
}
