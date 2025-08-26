import { WebSocketChatWindow } from '@/components/chat/WebSocketChatWindow'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">HotelsByDay Chat</h1>
              </div>
              <div className="text-sm text-gray-500">
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
