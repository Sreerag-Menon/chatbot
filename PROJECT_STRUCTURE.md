# Project Structure

## 📁 Directory Layout

```
chatbot2/
├── README.md                 # Main project documentation
├── package.json              # Root package.json with scripts
├── .gitignore               # Git ignore rules
├── docker-compose.yml       # Docker Compose configuration
├── setup.sh                 # Development setup script
├── env.example              # Environment variables template
├── PROJECT_STRUCTURE.md     # This file
│
├── backend/                 # FastAPI Backend
│   ├── main.py             # Main FastAPI application
│   ├── groq_client.py      # Groq LLM integration
│   ├── vectorstore.py      # ChromaDB vector database
│   ├── scraper.py          # Web scraping functionality
│   ├── db.py               # SQLite database operations
│   ├── utils.py            # Utility functions
│   ├── requirements.txt    # Python dependencies
│   ├── activate_venv.sh   # Virtual environment setup
│   ├── Dockerfile          # Backend Docker configuration
│   ├── README.md           # Backend-specific documentation
│   ├── uploads/            # File upload directory
│   ├── db/                 # Database files
│   ├── conversations.db    # SQLite database
│   └── test_*.py          # Test files
│
└── frontend/               # Next.js Frontend
    ├── src/                # Source code
    │   ├── app/            # Next.js app router
    │   │   ├── page.tsx    # Main chat page
    │   │   ├── admin/      # Admin dashboard
    │   │   │   └── page.tsx
    │   │   ├── layout.tsx  # Root layout
    │   │   └── globals.css # Global styles
    │   ├── components/     # React components
    │   │   ├── chat/       # Chat components
    │   │   │   ├── ChatWindow.tsx
    │   │   │   ├── MessageBubble.tsx
    │   │   │   ├── MessageInput.tsx
    │   │   │   └── WebSocketChatWindow.tsx
    │   │   └── admin/      # Admin components
    │   │       ├── WebSocketAdminChat.tsx
    │   │       └── KnowledgeBaseManager.tsx
    │   └── lib/            # Utility libraries
    │       ├── api.ts      # API client
    │       ├── types.ts    # TypeScript types
    │       └── utils.ts    # Utility functions
    ├── public/             # Static assets
    ├── package.json        # Node.js dependencies
    ├── next.config.ts      # Next.js configuration
    ├── tsconfig.json       # TypeScript configuration
    ├── Dockerfile          # Frontend Docker configuration
    └── README.md           # Frontend-specific documentation
```

## 🔧 Key Files Explained

### Root Level
- **README.md**: Main project documentation and setup instructions
- **package.json**: Root scripts for managing both backend and frontend
- **docker-compose.yml**: Container orchestration for deployment
- **setup.sh**: Automated development environment setup
- **.gitignore**: Comprehensive ignore rules for both Python and Node.js

### Backend (`backend/`)
- **main.py**: FastAPI application with WebSocket endpoints
- **groq_client.py**: Integration with Groq LLM for AI responses
- **vectorstore.py**: ChromaDB vector database for knowledge retrieval
- **scraper.py**: Web scraping for dynamic content updates
- **db.py**: SQLite database operations and conversation persistence
- **utils.py**: Utility functions for conversation processing
- **requirements.txt**: Python dependencies
- **activate_venv.sh**: Virtual environment activation script

### Frontend (`frontend/`)
- **src/app/**: Next.js app router pages
- **src/components/**: Reusable React components
- **src/lib/**: Utility libraries and API clients
- **package.json**: Node.js dependencies and scripts
- **next.config.ts**: Next.js configuration
- **tsconfig.json**: TypeScript configuration

## 🚀 Development Workflow

### Starting Development
```bash
# Setup (first time only)
./setup.sh

# Start both servers
npm run dev

# Or start individually
npm run dev:backend
npm run dev:frontend
```

### Testing
```bash
# Run all tests
npm run test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

### Building for Production
```bash
# Build frontend
npm run build

# Using Docker
docker-compose up --build
```

## 📋 API Structure

### REST Endpoints
- `POST /chat` - Send message to chatbot
- `GET /session/{session_id}/history` - Get conversation history
- `GET /session/{session_id}/summary` - Get conversation summary
- `GET /agent/sessions` - Get escalated sessions
- `POST /agent/sessions/{agent_id}/take` - Take control of session

### WebSocket Endpoints
- `ws://localhost:8000/ws/session/{session_id}` - Customer chat
- `ws://localhost:8000/ws/agent/{agent_id}` - Admin chat

## 🗄️ Database Schema

### conversations table
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    summary TEXT,
    email TEXT,
    phone TEXT,
    agent_id TEXT,
    session_id TEXT,
    escalated INTEGER DEFAULT 0,
    escalated_at TEXT
);
```

## 🔐 Environment Variables

### Backend (.env)
```
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=sqlite:///conversations.db
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up --build
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Troubleshooting

### Common Issues
1. **Backend won't start**: Check virtual environment and dependencies
2. **Frontend won't start**: Check Node.js version and dependencies
3. **WebSocket connection failed**: Ensure backend is running on port 8000
4. **Database errors**: Check file permissions for conversations.db

### Debug Commands
```bash
# Check backend logs
cd backend && source activate_venv.sh && python main.py

# Check frontend logs
cd frontend && npm run dev

# Check Docker logs
docker-compose logs
``` 