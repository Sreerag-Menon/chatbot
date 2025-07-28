#!/bin/bash

echo "🚀 Setting up Chatbot Project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo "🐍 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment and install dependencies
source activate_venv.sh
pip install -r requirements.txt

cd ..

# Setup frontend
echo "⚛️ Setting up frontend..."
cd frontend
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env file with your API keys"
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env file with your GROQ_API_KEY"
echo "2. Run 'npm run dev' to start both servers"
echo "3. Open http://localhost:3000 for the frontend"
echo "4. Open http://localhost:8000/docs for API documentation" 