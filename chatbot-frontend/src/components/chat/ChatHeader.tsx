import { AlertTriangle, Bot, UserCheck } from 'lucide-react'

interface ChatHeaderProps {
  sessionId: string
  isEscalated: boolean
  agentId?: string
  escalatedAt?: string
  messageCount: number
}

export function ChatHeader({
  sessionId,
  isEscalated,
  agentId,
  escalatedAt,
  messageCount
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isEscalated ? (
            <UserCheck className="w-5 h-5 text-green-600" />
          ) : (
            <Bot className="w-5 h-5 text-blue-600" />
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {isEscalated ? 'Human Agent' : 'HotelsByDay Assistant'}
          </h2>
        </div>

        {isEscalated && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <AlertTriangle size={12} />
            Escalated
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div>
          Session: {sessionId.slice(-8)}
        </div>
        <div>
          Messages: {messageCount}
        </div>
        {isEscalated && agentId && (
          <div>
            Agent: {agentId}
          </div>
        )}
        {isEscalated && escalatedAt && (
          <div>
            Escalated: {new Date(escalatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
} 