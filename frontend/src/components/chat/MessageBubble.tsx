import { Message } from '@/lib/types'
import { cn, formatTimestamp, getConfidenceColor, getConfidenceText } from '@/lib/utils'
import { Bot, User, UserCheck } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  isLastMessage?: boolean
}

export function MessageBubble({ message, isLastMessage }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAgent = message.role === 'agent'
  const isBot = message.role === 'assistant'

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[80%] gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
          isUser ? "bg-blue-500" : isAgent ? "bg-green-500" : "bg-gray-500"
        )}>
          {isUser ? (
            <User size={16} />
          ) : isAgent ? (
            <UserCheck size={16} />
          ) : (
            <Bot size={16} />
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          "rounded-lg px-4 py-2 shadow-sm",
          isUser
            ? "bg-blue-500 text-white"
            : isAgent
              ? "bg-green-100 text-green-900 border border-green-200"
              : "bg-gray-100 text-gray-900 border border-gray-200"
        )}>
          <div className="text-sm leading-relaxed">
            {message.content}
          </div>

          {/* Confidence Score (for bot messages) */}
          {isBot && message.confidence !== undefined && (
            <div className="mt-2 text-xs opacity-75">
              <span className={cn("font-medium", getConfidenceColor(message.confidence))}>
                Confidence: {getConfidenceText(message.confidence)} ({Math.round(message.confidence * 100)}%)
              </span>
            </div>
          )}

          {/* Timestamp */}
          {message.timestamp && (
            <div className="mt-1 text-xs opacity-60">
              {formatTimestamp(message.timestamp)}
            </div>
          )}

          {/* Agent ID (for agent messages) */}
          {isAgent && message.agent_id && (
            <div className="mt-1 text-xs opacity-60">
              Agent: {message.agent_id}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 