# HotelsByDay Chatbot Frontend

A modern, responsive Next.js frontend for the HotelsByDay chatbot with confidence-based escalation to human agents.

## 🚀 Features

### Core Chat Interface
- **Real-time chat** with the HotelsByDay AI assistant
- **Confidence scoring** displayed for each bot response
- **Automatic escalation** when confidence is low (< 0.4)
- **Session management** with persistent chat history
- **Responsive design** for desktop, tablet, and mobile

### Escalation System
- **Confidence-based escalation**: Bot automatically escalates when confidence score is below threshold
- **Human agent handoff**: Seamless transition from bot to human agent
- **Agent dashboard**: Admin panel for managing escalated sessions
- **Session continuity**: Human agents can continue conversations seamlessly

### Technical Features
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React hooks** for state management
- **Auto-scroll** to latest messages
- **Loading states** and error handling

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main chat interface
│   ├── admin/page.tsx        # Agent dashboard
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── chat/
│       ├── ChatWindow.tsx    # Main chat container
│       ├── MessageBubble.tsx # Individual message display
│       ├── MessageInput.tsx  # Message input component
│       └── ChatHeader.tsx    # Chat header with status
├── lib/
│   ├── api.ts               # API client functions
│   ├── types.ts             # TypeScript interfaces
│   └── utils.ts             # Utility functions
```

## 🛠 Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend server running (see backend README)

### Installation
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL to your backend URL

# Run development server
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🔧 Backend Integration

The frontend communicates with the Python FastAPI backend through these endpoints:

### Chat Endpoints
- `POST /chat` - Send user message, get bot response
- `GET /session/{session_id}/status` - Get session status
- `POST /agent-chat` - Human agent sends message
- `GET /agent/sessions` - Get escalated sessions

### Admin Endpoints
- `POST /update-website` - Update knowledge base
- `POST /upload-pdf` - Upload PDF for context

## 🎯 How Escalation Works

### 1. Confidence Scoring
- Bot responses include confidence scores (0.0-1.0)
- Confidence is extracted from LLM response format: `[CONFIDENCE: 0.85]`
- Fallback confidence calculation based on response content

### 2. Escalation Triggers
- Confidence score < 0.4 (configurable threshold)
- User explicitly requests human agent
- Bot indicates uncertainty ("I'm not sure", "I don't have that information")
- User mentions booking intent
- No relevant context found

### 3. Escalation Flow
1. **Detection**: Backend detects escalation trigger
2. **Agent Assignment**: Unique agent ID generated
3. **Session Transfer**: Chat session marked as escalated
4. **Notification**: Human agent notified via admin dashboard
5. **Handoff**: User sees escalation message, agent can respond

### 4. Human Agent Interface
- **Admin Dashboard** (`/admin`): View all escalated sessions
- **Session Management**: Take control of escalated chats
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Chat Continuity**: Continue conversation seamlessly

## 🎨 UI Components

### MessageBubble
- Different styles for user, bot, and agent messages
- Confidence score display for bot messages
- Timestamps and agent IDs
- Responsive design with proper spacing

### ChatHeader
- Session information display
- Escalation status indicator
- Message count and timing
- Agent assignment details

### MessageInput
- Real-time input with send button
- Loading states during API calls
- Enter key support (Shift+Enter for new line)
- Disabled state during escalation

## 🔄 State Management

### Chat State
```typescript
interface ChatState {
  sessionId: string
  messages: Message[]
  isLoading: boolean
  isEscalated: boolean
  agentId?: string
  escalatedAt?: string
  error?: string
}
```

### Session Persistence
- Session ID generated on first load
- Stored in component state
- Can be passed via URL parameter
- Maintains chat history during session

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Setup
- Set `NEXT_PUBLIC_API_URL` to production backend URL
- Configure CORS on backend for frontend domain
- Set up proper SSL certificates

### Recommended Platforms
- **Vercel**: Optimized for Next.js
- **Netlify**: Easy deployment with Git integration
- **AWS Amplify**: Full-stack deployment
- **Docker**: Containerized deployment

## 🔧 Configuration

### Confidence Threshold
Edit `LOW_CONFIDENCE_THRESHOLD` in backend `main.py`:
```python
LOW_CONFIDENCE_THRESHOLD = 0.4  # Adjust as needed
```

### API Base URL
Set in frontend environment:
```env
NEXT_PUBLIC_API_URL=http://your-backend-url.com
```

### Auto-refresh Interval
Modify in `admin/page.tsx`:
```typescript
const interval = setInterval(fetchEscalatedSessions, 30000) // 30 seconds
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend allows frontend domain
   - Check `NEXT_PUBLIC_API_URL` is correct

2. **Session Not Found**
   - Verify session ID format
   - Check backend session storage

3. **Escalation Not Working**
   - Verify confidence threshold setting
   - Check LLM response format includes confidence score

4. **Agent Dashboard Empty**
   - Ensure backend escalation endpoints work
   - Check agent session storage

### Debug Mode
Enable debug logging in browser console:
```typescript
// Add to any component
console.log('Debug info:', { sessionId, messages, isEscalated })
```

## 📈 Future Enhancements

### Planned Features
- **Real-time notifications** using WebSockets
- **File upload** support for users
- **Voice messages** integration
- **Multi-language** support
- **Advanced analytics** dashboard
- **Agent performance** metrics

### Technical Improvements
- **WebSocket** for real-time chat
- **Redis** for session storage
- **JWT** authentication for agents
- **Rate limiting** and security
- **Automated testing** suite

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
