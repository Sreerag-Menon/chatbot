# Chatbot Project

A full-stack chatbot application with FastAPI backend and Next.js frontend, featuring real-time WebSocket communication, admin dashboard, and intelligent conversation management.

## 🏗️ Project Structure

```
chatbot2/
├── backend/          # FastAPI backend with WebSocket support
│   ├── main.py       # Main FastAPI application
│   ├── groq_client.py # Groq LLM integration
│   ├── vectorstore.py # ChromaDB vector database
│   ├── scraper.py    # Web scraping functionality
│   ├── db.py         # SQLite database operations
│   ├── utils.py      # Utility functions
│   ├── requirements.txt # Python dependencies
│   ├── activate_venv.sh # Virtual environment setup
│   └── uploads/      # File upload directory
├── frontend/         # Next.js frontend
│   ├── src/          # Source code
│   │   ├── app/      # Next.js app router
│   │   ├── components/ # React components
│   │   └── lib/      # Utility libraries
│   ├── public/       # Static assets
│   ├── package.json  # Node.js dependencies
│   └── next.config.ts # Next.js configuration
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Git**

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source activate_venv.sh

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```

The backend will be available at: http://localhost:8000

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: http://localhost:3000

## 🌐 Application URLs

- **Main Chat Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Features

### Backend Features
- **FastAPI** with WebSocket support
- **Groq LLM** integration for intelligent responses
- **ChromaDB** vector database for knowledge retrieval
- **Web scraping** for dynamic content updates
- **SQLite** database for conversation persistence
- **Real-time communication** via WebSockets
- **Admin session management** with escalation support

### Frontend Features
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Real-time chat** with WebSocket integration
- **Admin dashboard** for session management
- **Knowledge base management** interface
- **Responsive design** for all devices

## 📋 API Endpoints

### Chat Endpoints
- `POST /chat` - Send message to chatbot
- `GET /session/{session_id}/history` - Get conversation history
- `GET /session/{session_id}/summary` - Get conversation summary

### Admin Endpoints
- `GET /agent/sessions` - Get escalated sessions
- `POST /agent/sessions/{agent_id}/take` - Take control of session
- `GET /admin/knowledge-base/status` - Get knowledge base status
- `POST /admin/knowledge-base/force-update` - Update knowledge base

### WebSocket Endpoints
- `ws://localhost:8000/ws/session/{session_id}` - Customer chat
- `ws://localhost:8000/ws/agent/{agent_id}` - Admin chat

## 🛠️ Development

### Backend Development

```bash
cd backend
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
python test_summary_feature.py
python test_escalation_persistence.py
python test_take_session_flow.py

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Backend Deployment
- The backend can be deployed to any Python hosting service
- Ensure all dependencies are installed
- Set up environment variables for API keys
- Configure CORS settings for production

### Frontend Deployment
- The frontend can be deployed to Vercel, Netlify, or any static hosting
- Update API endpoints for production URLs
- Configure environment variables

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the console logs for both frontend and backend
2. Verify all dependencies are installed
3. Ensure the virtual environment is activated for backend
4. Check that both servers are running on the correct ports

## 🎯 Roadmap

- [ ] Add authentication system
- [ ] Implement user management
- [ ] Add analytics dashboard
- [ ] Support for multiple languages
- [ ] Mobile app development
- [ ] Advanced AI features 