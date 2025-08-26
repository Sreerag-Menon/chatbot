# Chatbot Project

A full-stack chatbot application with FastAPI backend and Next.js frontend.

## 🏗️ Project Structure

```
chatbot2/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── README.md         # This file
└── .gitignore        # Root gitignore
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup
```bash
cd backend
source activate_venv.sh  # or create a new virtual environment
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access Points

- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **API Documentation**: http://localhost:8000/docs

## 📋 Features

### Customer Features
- Real-time chat with AI assistant
- Automatic escalation to human agents
- WebSocket-based communication
- Session persistence

### Admin Features
- Real-time admin chat interface
- Knowledge base management
- Website content scraping
- PDF document upload
- Session monitoring and management

### Technical Features
- RAG (Retrieval-Augmented Generation)
- Vector database (ChromaDB)
- WebSocket communication
- SQLite session storage
- Groq LLM integration

## 🛠️ Development

### Backend Development
```bash
cd backend
# Activate virtual environment
source activate_venv.sh
# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Testing
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Backend Deployment
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend Deployment
```bash
cd frontend
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Endpoints

### Chat Endpoints
- `POST /chat` - Send chat message
- `GET /session/{session_id}/status` - Get session status
- `GET /session/{session_id}/history` - Get chat history
- `GET /session/{session_id}/summary` - Get conversation summary

### Admin Endpoints
- `GET /agent/sessions` - Get escalated sessions
- `POST /agent/sessions/{agent_id}/take` - Take a session
- `POST /agent-chat` - Send agent message

### Knowledge Base Endpoints
- `GET /admin/knowledge-base/status` - Get KB status
- `POST /admin/knowledge-base/force-update` - Force update website
- `GET /admin/knowledge-base/documents` - Get indexed documents
- `DELETE /admin/knowledge-base/clear` - Clear knowledge base

### WebSocket Endpoints
- `ws://localhost:8000/ws/session/{session_id}` - Customer chat
- `ws://localhost:8000/ws/agent/{agent_id}` - Admin chat

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 