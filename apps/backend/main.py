from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import re
import hashlib
from datetime import datetime
import json
import uuid

from database import init_db, get_db_session
from models import User, Conversation
from auth import authenticate_user, create_access_token, get_current_user, require_role
from schemas import LoginRequest, SignupRequest, Token, UserResponse, UserUpdate, UserCreate, BotTestRequest, BotTestResponse, BotAccuracyTest, BotAccuracyResult, BotValidationRequest
from groq_client import chat_with_groq, get_confidence_score
from utils import generate_brief_summary

from scraper import scrape_website, compute_hash, crawl_site
from vectorstore import (
    index_text, index_documents, extract_text_from_pdf,
    retrieve_context, get_knowledge_base_stats, get_indexed_documents,
    clear_knowledge_base as vs_clear
)

from dotenv import load_dotenv
load_dotenv()

# -----------------------------------------------------------------------------
# App & CORS
# -----------------------------------------------------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Website scraping configuration
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://www.supportsages.com")
last_scraped_hash = None

# runtime state
chat_sessions: Dict[str, dict] = {}
human_agent_sessions: Dict[str, dict] = {}

# -----------------------------------------------------------------------------
# WebSocket connection manager
# -----------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_connections: Dict[str, str] = {}
        self.agent_connections: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # reverse lookups
        session_id = None
        agent_id = None
        for sid, cid in self.session_connections.items():
            if cid == connection_id:
                session_id = sid
                break
        for aid, cid in self.agent_connections.items():
            if cid == connection_id:
                agent_id = aid
                break

        if session_id:
            del self.session_connections[session_id]
        if agent_id:
            del self.agent_connections[agent_id]

    async def send_personal_message(self, message: str, connection_id: str):
        if connection_id in self.active_connections:
            await self.active_connections[connection_id].send_text(message)

    async def broadcast_to_session(self, message: str, session_id: str):
        if session_id in self.session_connections:
            connection_id = self.session_connections[session_id]
            await self.send_personal_message(message, connection_id)

    async def broadcast_to_agent(self, message: str, agent_id: str):
        if agent_id in self.agent_connections:
            connection_id = self.agent_connections[agent_id]
            await self.send_personal_message(message, connection_id)

manager = ConnectionManager()

# -----------------------------------------------------------------------------
# Auth endpoints (unchanged behavior)
# -----------------------------------------------------------------------------
@app.post("/auth/signup", response_model=UserResponse)
async def signup(user_data: SignupRequest, db: Session = Depends(get_db_session)):
    if user_data.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin users cannot be created through signup")

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    from auth import get_password_hash
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role=user_data.role,
        is_verified=True  # demo choice
    )
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user


@app.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db_session)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not verified")
    if user.role != login_data.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role mismatch")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/admin/users", response_model=List[UserResponse])
async def get_users(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db_session)):
    return db.query(User).all()


@app.put("/admin/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db_session)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit(); db.refresh(user)
    return user


@app.post("/admin/users", response_model=UserResponse)
async def create_user(
    new_user: UserCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db_session)
):
    """Admin-only: create a new user (employee or admin)."""
    existing_user = db.query(User).filter(User.email == new_user.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    from auth import get_password_hash
    hashed_password = get_password_hash(new_user.password)
    db_user = User(
        email=new_user.email,
        username=new_user.username,
        hashed_password=hashed_password,
        role=new_user.role,
        is_active=True,
        is_verified=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# -----------------------------------------------------------------------------
# Chat models
# -----------------------------------------------------------------------------
class Message(BaseModel):
    role: str
    content: str
    confidence: Optional[float] = None
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str
    email: Optional[str] = None
    phone: Optional[str] = None
    agent_id: Optional[str] = None

class HumanAgentRequest(BaseModel):
    session_id: str
    agent_id: str
    message: str

class SessionStatus(BaseModel):
    session_id: str
    is_escalated: bool
    agent_id: Optional[str] = None
    escalated_at: Optional[str] = None
    confidence_threshold: float = 0.4

# -----------------------------------------------------------------------------
# Human intent & greeting (fixed)
# -----------------------------------------------------------------------------
BRAND_NAME = "supportsages"  # used to prevent 'support' false positives

def is_simple_greeting(message: str) -> bool:
    msg = message.lower().strip()
    simple = [
        "hello","hi","hey","good morning","good afternoon","good evening",
        "morning","afternoon","evening","yo","sup","hey there","hiya"
    ]
    if msg in simple:
        return True
    return any(msg.startswith(g) and len(msg) <= len(g) + 5 for g in simple)

_HUMAN_INTENT_PATTERNS = [
    r"\b(connect|talk|speak)\s+(to|with)\s+(a\s+)?(human|agent|person|representative|rep)\b",
    r"\b(human|live)\s+(agent|person|representative|rep)\b",
    r"\b(escalate|escalation|supervisor|manager)\b",
    r"\b(contact|reach)\s+(customer\s+service|support\s*team|help\s*desk)\b",
    r"\bneed\s+(help|assistance)\s+from\s+(a\s+)?(person|human|agent)\b",
]
_HUMAN_INTENT_RE = re.compile("|".join(_HUMAN_INTENT_PATTERNS), re.IGNORECASE)

def user_wants_human_agent(message: str) -> bool:
    """
    True only for explicit human-agent intent; ignores brand token 'SupportSages'.
    """
    if not message:
        return False
    if is_simple_greeting(message):
        return False

    msg_lc = message.lower()
    if BRAND_NAME in msg_lc:
        msg_lc = msg_lc.replace(BRAND_NAME, "")
    return bool(_HUMAN_INTENT_RE.search(msg_lc))


# -----------------------------------------------------------------------------
# Shared system prompt for both REST & WS
# -----------------------------------------------------------------------------
def build_system_prompt(context_text: str) -> str:
    return f"""
You are a professional assistant for SupportSages (DevOps, CloudOps, SRE, Helpdesk & VAPT services).

Rules:
- Use the provided context when possible.
- If the question is a simple greeting, respond warmly and proceed.
- If context is empty or insufficient, answer with general, safe info about SupportSages (no prices/guesses).
- Do NOT suggest escalation to a human unless the user explicitly asks. Never write "I'll connect you to a human" on your own.
- Never invent specific prices/SLAs not in context.

Context:
{context_text if context_text.strip() else "NO CONTEXT AVAILABLE"}

End your reply with a confidence score tag exactly like: [CONFIDENCE: 0.85]
- Greeting/basic overview: 0.8–0.95
- Answer grounded in context: 0.7–0.9
- General but plausible without context: 0.5–0.7
- Can’t help: 0.1–0.3
""".strip()


# -----------------------------------------------------------------------------
# Conversation persistence helpers
# -----------------------------------------------------------------------------
def save_conversation_to_db(summary: str, email: str = None, phone: str = None, agent_id: str = None, session_id: str = None, escalated: bool = False):
    try:
        with next(get_db_session()) as db:
            conversation = Conversation(
                summary=summary,
                email=email,
                phone=phone,
                agent_id=agent_id,
                session_id=session_id,
                escalated=escalated,
                escalated_at=datetime.now() if escalated else None
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            print(f"[INFO] Conversation saved to database with ID: {conversation.id}")
            return conversation
    except Exception as e:
        print(f"[ERROR] Failed to save conversation to database: {e}")
        return None


def escalate_to_human(session_id: str, session: dict):
    session["escalated"] = True
    session["escalated_at"] = datetime.now().isoformat()

    agent_id = f"agent_{uuid.uuid4().hex[:8]}"
    session["agent_id"] = agent_id

    human_agent_sessions[agent_id] = {
        "session_id": session_id,
        "history": session["history"].copy(),
        "escalated_at": session["escalated_at"],
        "status": "waiting"
    }

    summary = generate_brief_summary(session["history"])
    print(f"\n=== URGENT HUMAN ALERT ===")
    print(f"Session ID: {session_id}")
    print(f"Agent ID: {agent_id}")
    print(f"Chat Summary:\n{summary}")
    print("==========================\n")

    save_conversation_to_db(summary, agent_id=agent_id, session_id=session_id, escalated=True)
    return agent_id


def load_escalated_sessions_from_db():
    try:
        with next(get_db_session()) as db:
            rows = db.query(Conversation).filter(
                Conversation.escalated == True,
                Conversation.agent_id.isnot(None),
                Conversation.session_id.isnot(None)
            ).all()

            for conversation in rows:
                session_id = conversation.session_id
                agent_id = conversation.agent_id
                escalated_at = conversation.escalated_at.isoformat() if conversation.escalated_at else None

                if session_id not in chat_sessions:
                    chat_sessions[session_id] = {
                        "history": [],
                        "escalated": True,
                        "agent_id": agent_id,
                        "escalated_at": escalated_at,
                        "confidence_scores": [],
                        "low_confidence_streak": 0,
                    }
                else:
                    chat_sessions[session_id]["escalated"] = True
                    chat_sessions[session_id]["agent_id"] = agent_id
                    chat_sessions[session_id]["escalated_at"] = escalated_at

                human_agent_sessions[agent_id] = {
                    "session_id": session_id,
                    "history": chat_sessions[session_id]["history"].copy(),
                    "escalated_at": escalated_at,
                    "status": "waiting"
                }

                print(f"[INFO] Restored escalated session: {session_id} -> {agent_id}")
            print(f"[INFO] Loaded {len(rows)} escalated sessions from database")
    except Exception as e:
        print(f"[ERROR] Failed to load escalated sessions from database: {e}")


# -----------------------------------------------------------------------------
# REST: Chat (with fixed escalation)
# -----------------------------------------------------------------------------
@app.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db_session)):
    session_id = req.session_id
    user_message = (req.message or "").strip()
    print(f"[User:{session_id}] {user_message}")

    # If already escalated, don't route back to LLM
    if session_id in chat_sessions and chat_sessions[session_id].get("escalated"):
        user_msg = {"role": "user", "content": user_message, "timestamp": datetime.now().isoformat()}
        chat_sessions[session_id]["history"].append(user_msg)
        agent_id = chat_sessions[session_id].get("agent_id")
        if agent_id and agent_id in human_agent_sessions:
            human_agent_sessions[agent_id]["history"].append(user_msg)
            return JSONResponse({"reply": "Your message has been sent to the human agent. They will respond shortly.","escalated": True,"agent_id": agent_id})
        else:
            return JSONResponse({"reply": "This conversation has been escalated to a human agent. Please wait for their response.","escalated": True,"agent_id": agent_id})

    # init session
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "history": [],
            "escalated": False,
            "agent_id": None,
            "escalated_at": None,
            "confidence_scores": [],
            "low_confidence_streak": 0,
        }

    session = chat_sessions[session_id]

    # history append
    user_msg = {"role": "user", "content": user_message, "timestamp": datetime.now().isoformat()}
    session["history"].append(user_msg)

    # RAG
    retrieved_docs = retrieve_context(user_message, k=4)
    context_text = "\n".join([doc.page_content for doc in retrieved_docs])

    # prompt
    system_prompt = build_system_prompt(context_text)
    messages = [{"role": "system", "content": system_prompt}] + session["history"]

    # LLM call
    response = chat_with_groq(messages)
    bot_reply = response.content.strip()

    # confidence
    confidence_score = get_confidence_score(bot_reply)
    bot_reply_clean = bot_reply.replace(f"[CONFIDENCE: {confidence_score}]", "").strip()

    # parse float & clip if we had real context
    try:
        confidence = float(confidence_score)
    except Exception:
        confidence = 0.0

    context_is_empty = not context_text.strip()
    retrieved_count = len(retrieved_docs)
    if not context_is_empty and retrieved_count > 0 and confidence < 0.35:
        confidence = 0.35

    # two-strike logic
    streak = session.get("low_confidence_streak", 0)
    if confidence < 0.25:
        streak += 1
    else:
        streak = 0
    session["low_confidence_streak"] = streak

    explicit_intent = user_wants_human_agent(user_message)

    should_escalate = (
        explicit_intent or
        (
            confidence < 0.2 and
            (context_is_empty or retrieved_count == 0) and
            streak >= 2
        )
    )

    if should_escalate and not session["escalated"]:
        print("[ESCALATE]", "explicit_user_request" if explicit_intent else f"auto_low_conf (conf={confidence:.2f}, streak={streak}, ctx_empty={context_is_empty})")
        agent_id = escalate_to_human(session_id, session)
        bot_reply_clean = f"Thank you. I'm connecting you to a human agent now. Your session ID is: {session_id}"
        return JSONResponse({"reply": bot_reply_clean, "escalated": True, "agent_id": agent_id, "confidence_score": confidence, "session_id": session_id})

    # record bot message
    bot_msg = {
        "role": "assistant",
        "content": bot_reply_clean,
        "confidence": confidence,
        "timestamp": datetime.now().isoformat()
    }
    session["history"].append(bot_msg)
    session["confidence_scores"].append(confidence)

    return JSONResponse({"reply": bot_reply_clean, "escalated": False, "confidence_score": confidence, "session_id": session_id})


# -----------------------------------------------------------------------------
# Bot Testing & Validation Endpoints
# -----------------------------------------------------------------------------

@app.post("/admin/bot/test", response_model=BotTestResponse)
async def test_bot_response(
    test_request: BotTestRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db_session)
):
    """Admin endpoint to test individual bot responses"""
    start_time = datetime.now()
    
    try:
        # Create a unique test session ID
        test_session_id = f"test_{uuid.uuid4().hex[:8]}"
        
        # Prepare the message for the bot
        user_message = test_request.message.strip()
        
        # Retrieve context from knowledge base
        retrieved_docs = retrieve_context(user_message, k=4)
        context_text = "\n".join([doc.page_content for doc in retrieved_docs])
        
        # Build system prompt
        system_prompt = build_system_prompt(context_text)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # Get bot response
        response = chat_with_groq(messages)
        bot_reply = response.content.strip()
        
        # Calculate confidence score
        confidence_score = get_confidence_score(bot_reply)
        bot_reply_clean = bot_reply.replace(f"[CONFIDENCE: {confidence_score}]", "").strip()
        
        # Calculate response time
        end_time = datetime.now()
        response_time = int((end_time - start_time).total_seconds() * 1000)
        
        # Extract context information
        context_used = [doc.page_content[:100] + "..." for doc in retrieved_docs] if retrieved_docs else []
        
        return BotTestResponse(
            bot_response=bot_reply_clean,
            confidence_score=float(confidence_score),
            response_time_ms=response_time,
            context_used=context_used,
            retrieved_documents=len(retrieved_docs),
            test_id=test_session_id,
            timestamp=end_time
        )
        
    except Exception as e:
        print(f"[ERROR] Bot test failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bot test failed: {str(e)}"
        )


@app.post("/admin/bot/accuracy-test", response_model=BotAccuracyResult)
async def run_accuracy_test(
    accuracy_test: BotAccuracyTest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db_session)
):
    """Admin endpoint to run comprehensive accuracy tests"""
    start_time = datetime.now()
    test_results = []
    total_confidence = 0.0
    total_response_time = 0
    
    try:
        for i, test_case in enumerate(accuracy_test.test_cases):
            case_start_time = datetime.now()
            
            # Test individual case
            user_message = test_case.message.strip()
            
            # Retrieve context
            retrieved_docs = retrieve_context(user_message, k=4)
            context_text = "\n".join([doc.page_content for doc in retrieved_docs])
            
            # Build system prompt
            system_prompt = build_system_prompt(context_text)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            # Get bot response
            response = chat_with_groq(messages)
            bot_reply = response.content.strip()
            
            # Calculate confidence
            confidence_score = get_confidence_score(bot_reply)
            bot_reply_clean = bot_reply.replace(f"[CONFIDENCE: {confidence_score}]", "").strip()
            
            # Calculate response time
            case_end_time = datetime.now()
            response_time = int((case_end_time - case_start_time).total_seconds() * 1000)
            
            # Create test result
            test_result = BotTestResponse(
                bot_response=bot_reply_clean,
                confidence_score=float(confidence_score),
                response_time_ms=response_time,
                context_used=[doc.page_content[:100] + "..." for doc in retrieved_docs] if retrieved_docs else [],
                retrieved_documents=len(retrieved_docs),
                test_id=f"{accuracy_test.test_name}_{i}",
                timestamp=case_end_time
            )
            
            test_results.append(test_result)
            total_confidence += float(confidence_score)
            total_response_time += response_time
        
        # Calculate overall metrics
        total_tests = len(accuracy_test.test_cases)
        average_confidence = total_confidence / total_tests if total_tests > 0 else 0.0
        average_response_time = total_response_time / total_tests if total_tests > 0 else 0
        
        # Calculate accuracy based on confidence scores
        passed_tests = sum(1 for result in test_results if result.confidence_score >= 0.6)
        failed_tests = total_tests - passed_tests
        accuracy_percentage = (passed_tests / total_tests * 100) if total_tests > 0 else 0.0
        
        end_time = datetime.now()
        
        return BotAccuracyResult(
            test_name=accuracy_test.test_name,
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            average_confidence=average_confidence,
            average_response_time=average_response_time,
            accuracy_percentage=accuracy_percentage,
            detailed_results=test_results,
            timestamp=end_time
        )
        
    except Exception as e:
        print(f"[ERROR] Accuracy test failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Accuracy test failed: {str(e)}"
        )


@app.post("/admin/bot/validate", response_model=dict)
async def validate_bot_response(
    validation_request: BotValidationRequest,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db_session)
):
    """Admin endpoint to validate bot responses against specific criteria"""
    start_time = datetime.now()
    
    try:
        user_message = validation_request.message.strip()
        
        # Retrieve context
        retrieved_docs = retrieve_context(user_message, k=4)
        context_text = "\n".join([doc.page_content for doc in retrieved_docs])
        
        # Build system prompt
        system_prompt = build_system_prompt(context_text)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # Get bot response
        response = chat_with_groq(messages)
        bot_reply = response.content.strip()
        
        # Calculate confidence
        confidence_score = get_confidence_score(bot_reply)
        bot_reply_clean = bot_reply.replace(f"[CONFIDENCE: {confidence_score}]", "").strip()
        
        # Calculate response time
        end_time = datetime.now()
        response_time = int((end_time - start_time).total_seconds() * 1000)
        
        # Validation results
        validation_results = {
            "bot_response": bot_reply_clean,
            "confidence_score": float(confidence_score),
            "response_time_ms": response_time,
            "validation_passed": True,
            "validation_details": {}
        }
        
        # Check response time
        if validation_request.max_response_time:
            time_valid = response_time <= validation_request.max_response_time
            validation_results["validation_details"]["response_time"] = {
                "valid": time_valid,
                "expected_max": validation_request.max_response_time,
                "actual": response_time
            }
            if not time_valid:
                validation_results["validation_passed"] = False
        
        # Check for expected keywords
        if validation_request.expected_keywords:
            found_keywords = []
            missing_keywords = []
            response_lower = bot_reply_clean.lower()
            
            for keyword in validation_request.expected_keywords:
                if keyword.lower() in response_lower:
                    found_keywords.append(keyword)
                else:
                    missing_keywords.append(keyword)
            
            validation_results["validation_details"]["keywords"] = {
                "found": found_keywords,
                "missing": missing_keywords,
                "valid": len(missing_keywords) == 0
            }
            
            if len(missing_keywords) > 0:
                validation_results["validation_passed"] = False
        
        # Check sentiment (basic implementation)
        if validation_request.expected_sentiment:
            positive_words = ["good", "great", "excellent", "helpful", "positive", "yes", "can", "will"]
            negative_words = ["bad", "poor", "sorry", "cannot", "unfortunately", "no", "unable"]
            
            response_lower = bot_reply_clean.lower()
            positive_count = sum(1 for word in positive_words if word in response_lower)
            negative_count = sum(1 for word in negative_words if word in response_lower)
            
            if positive_count > negative_count:
                detected_sentiment = "positive"
            elif negative_count > positive_count:
                detected_sentiment = "negative"
            else:
                detected_sentiment = "neutral"
            
            sentiment_valid = detected_sentiment == validation_request.expected_sentiment
            
            validation_results["validation_details"]["sentiment"] = {
                "valid": sentiment_valid,
                "expected": validation_request.expected_sentiment,
                "detected": detected_sentiment
            }
            
            if not sentiment_valid:
                validation_results["validation_passed"] = False
        
        return validation_results
        
    except Exception as e:
        print(f"[ERROR] Bot validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bot validation failed: {str(e)}"
        )


@app.get("/admin/bot/test-history")
async def get_test_history(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db_session),
    limit: int = 50,
    offset: int = 0
):
    """Admin endpoint to retrieve bot test history"""
    try:
        # For now, return a simple structure. In a real implementation,
        # you'd store test results in the database
        return {
            "message": "Test history endpoint ready for database integration",
            "limit": limit,
            "offset": offset,
            "total_tests": 0,
            "tests": []
        }
    except Exception as e:
        print(f"[ERROR] Failed to retrieve test history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve test history: {str(e)}"
        )


# -----------------------------------------------------------------------------
# Debug Chat (uses same prompt builder)
# -----------------------------------------------------------------------------
@app.post("/debug/chat")
async def debug_chat(req: ChatRequest):
    session_id = req.session_id
    user_message = (req.message or "").strip()
    print(f"[DEBUG] User message: {user_message}")

    retrieved_docs = retrieve_context(user_message, k=4)
    context_text = "\n".join([doc.page_content for doc in retrieved_docs])
    print(f"[DEBUG] Retrieved {len(retrieved_docs)} docs, context_len={len(context_text)}")

    system_prompt = build_system_prompt(context_text)
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}]
    response = chat_with_groq(messages)
    bot_reply = response.content.strip()

    confidence_score = get_confidence_score(bot_reply)
    bot_reply_clean = bot_reply.replace(f"[CONFIDENCE: {confidence_score}]", "").strip()

    return JSONResponse({
        "reply": bot_reply_clean,
        "confidence_score": confidence_score,
        "context_length": len(context_text),
        "documents_retrieved": len(retrieved_docs),
        "context_preview": context_text[:200] + "..." if len(context_text) > 200 else context_text
    })


# -----------------------------------------------------------------------------
# Agent chat + session mgmt (unchanged behavior)
# -----------------------------------------------------------------------------
@app.post("/agent-chat")
async def agent_chat(
    req: HumanAgentRequest,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db_session)
):
    session_id = req.session_id
    agent_id = req.agent_id
    agent_message = (req.message or "").strip()

    if agent_id not in human_agent_sessions:
        return JSONResponse({"status": "error","message": "Invalid agent ID or session not found"}, status_code=404)

    agent_session = human_agent_sessions[agent_id]
    if agent_session["session_id"] != session_id:
        return JSONResponse({"status": "error","message": "Agent not authorized for this session"}, status_code=403)

    if session_id in chat_sessions:
        chat_sessions[session_id]["history"].append({
            "role": "agent",
            "content": agent_message,
            "timestamp": datetime.now().isoformat(),
            "agent_id": agent_id
        })
        agent_session["status"] = "active"
        agent_session["history"].append({
            "role": "agent",
            "content": agent_message,
            "timestamp": datetime.now().isoformat()
        })

    return JSONResponse({"status": "success","message": "Agent message sent successfully"})


@app.post("/agent/sessions/{agent_id}/take")
async def take_session(
    agent_id: str,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db_session)
):
    if agent_id not in human_agent_sessions:
        return JSONResponse({"status": "error","message": "Agent session not found"}, status_code=404)
    human_agent_sessions[agent_id]["status"] = "active"
    return JSONResponse({
        "status": "success",
        "message": f"Session taken by agent {agent_id}",
        "agent_id": agent_id,
        "session_id": human_agent_sessions[agent_id]["session_id"]
    })


@app.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    if session_id not in chat_sessions:
        return JSONResponse({"status": "error","message": "Session not found"}, status_code=404)
    session = chat_sessions[session_id]
    return JSONResponse({
        "session_id": session_id,
        "is_escalated": session.get("escalated", False),
        "agent_id": session.get("agent_id"),
        "escalated_at": session.get("escalated_at"),
        "message_count": len(session.get("history", [])),
        "confidence_scores": session.get("confidence_scores", []),
        "low_confidence_streak": session.get("low_confidence_streak", 0),
    })


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    if session_id not in chat_sessions:
        return JSONResponse({"status": "error","message": "Session not found"}, status_code=404)
    session = chat_sessions[session_id]
    return JSONResponse({
        "session_id": session_id,
        "history": session.get("history", []),
        "escalated": session.get("escalated", False),
        "agent_id": session.get("agent_id"),
        "escalated_at": session.get("escalated_at")
    })


@app.get("/session/{session_id}/summary")
async def get_session_summary(session_id: str):
    if session_id not in chat_sessions:
        return JSONResponse({"status": "error","message": "Session not found"}, status_code=404)
    session = chat_sessions[session_id]
    history = session.get("history", [])
    if not history:
        return JSONResponse({"status": "success","summary": "No conversation history available.","message_count": 0})
    summary = generate_brief_summary(history)
    return JSONResponse({
        "status": "success",
        "summary": summary,
        "message_count": len(history),
        "escalated": session.get("escalated", False),
        "agent_id": session.get("agent_id"),
        "escalated_at": session.get("escalated_at")
    })


@app.get("/agent/sessions")
async def get_escalated_sessions(current_user: User = Depends(require_role(["admin", "employee"])), db: Session = Depends(get_db_session)):
    escalated_sessions = []
    for aid, session_data in human_agent_sessions.items():
        if session_data["status"] == "waiting":
            escalated_sessions.append({
                "agent_id": aid,
                "session_id": session_data["session_id"],
                "escalated_at": session_data["escalated_at"],
                "message_count": len(session_data["history"])
            })
    return JSONResponse({"escalated_sessions": escalated_sessions,"total_waiting": len(escalated_sessions)})


# -----------------------------------------------------------------------------
# Knowledge base admin endpoints
# -----------------------------------------------------------------------------
def _hash_crawl_payload(items: List[dict]) -> str:
    h = hashlib.sha256()
    for it in sorted(items, key=lambda x: x["url"]):
        h.update(it["url"].encode("utf-8"))
        h.update(it["hash"].encode("utf-8"))
    return h.hexdigest()


@app.get("/admin/knowledge-base/status")
async def kb_status(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db_session)):
    stats = get_knowledge_base_stats()
    return JSONResponse({"status": "success", "data": stats})


@app.get("/admin/knowledge-base/documents")
async def kb_documents(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db_session)):
    docs = get_indexed_documents()
    return JSONResponse({"status": "success", "data": docs})


@app.delete("/admin/knowledge-base/clear")
async def kb_clear(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db_session)):
    try:
        vs_clear()
        global last_scraped_hash
        last_scraped_hash = None
        return JSONResponse({"status": "success", "message": "Knowledge base cleared successfully."})
    except Exception as e:
        return JSONResponse({"status": "error", "message": f"Failed to clear: {e}"}, status_code=500)


@app.post("/update-website")
async def update_vector_store():
    """
    Quick single-page scrape & index for the root URL (hash-checked).
    """
    global last_scraped_hash
    try:
        url = WEBSITE_URL
        print(f"[INFO] Single-page scrape: {url}")
        content = scrape_website(url)
        if content.startswith("Error"):
            return {"status": "error", "message": content}

        current_hash = compute_hash(content)
        if current_hash != last_scraped_hash:
            print("[INFO] Website updated. Indexing main page...")
            index_text(content, metadata={
                "source": "website_main",
                "url": url,
                "type": "main_page",
                "updated_at": datetime.now().isoformat()
            })
            last_scraped_hash = current_hash
            return {"status": "updated", "message": "Website changed and content indexed."}
        else:
            return {"status": "unchanged", "message": "No changes detected on website."}
    except Exception as e:
        return {"status": "error", "message": f"Website update failed: {str(e)}"}


@app.post("/admin/knowledge-base/force-update")
async def force_update_website(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db_session)):
    """
    Force crawl & re-index across the site regardless of previous hash.
    """
    global last_scraped_hash
    try:
        base = WEBSITE_URL.rstrip("/") + "/"
        seeds = [base, base + "blog", base + "case-studies", base + "about-cloud-service-provider"]

        print("[INFO] Force crawling site...")
        pages = crawl_site(base, extra_seeds=seeds[1:], max_pages=400, delay_sec=0.4, allow_subdomains=True)
        if not pages:
            return JSONResponse({"status": "error", "message": "No content found during crawl."}, status_code=500)

        from langchain_core.documents import Document
        now = datetime.now().isoformat()
        docs = [Document(page_content=p["text"], metadata={"url": p["url"], "title": p["title"], "source": "website", "updated_at": now}) for p in pages]
        added = index_documents(docs)

        last_scraped_hash = _hash_crawl_payload(pages)
        return {"status": "success", "message": f"Force indexed {added} chunks from {len(pages)} pages.", "hash": last_scraped_hash}
    except Exception as e:
        return JSONResponse({"status": "error", "message": f"Force update failed: {str(e)}"}, status_code=500)


@app.post("/admin/knowledge-base/crawl-website")
async def crawl_website_comprehensive(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db_session)):
    """
    Comprehensive crawl for initial setup; does NOT clear existing content.
    """
    try:
        base = WEBSITE_URL.rstrip("/") + "/"
        pages = crawl_site(base, extra_seeds=[base + "blog", base + "case-studies"], max_pages=250, delay_sec=0.3, allow_subdomains=True)
        if not pages:
            return JSONResponse({"status": "error", "message": "No content found during crawl."}, status_code=500)

        total_indexed = 0
        for p in pages:
            if p["text"] and len(p["text"].strip()) > 100:
                index_text(p["text"], metadata={
                    "source": "website_comprehensive",
                    "url": p["url"],
                    "title": p["title"],
                    "type": "comprehensive_crawl",
                    "hash": p["hash"],
                    "timestamp": p["ts"],
                    "crawled_at": datetime.now().isoformat()
                })
                total_indexed += 1

        return JSONResponse({
            "status": "success",
            "message": f"Crawled {len(pages)} pages, indexed {total_indexed} pages.",
            "pages_crawled": len(pages),
            "pages_indexed": total_indexed,
            "crawl_timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return JSONResponse({"status": "error", "message": f"Comprehensive crawling failed: {str(e)}"}, status_code=500)


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        return {"status": "error", "message": "Only PDF files are supported."}
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    content = extract_text_from_pdf(file_path)
    if not content.strip():
        return {"status": "error", "message": "Failed to extract text from PDF."}

    index_text(content, metadata={"source": file.filename, "uploaded_at": datetime.now().isoformat()})
    return {"status": "success", "message": f"{file.filename} uploaded and indexed."}


# -----------------------------------------------------------------------------
# WebSocket endpoints (customer & agent) — unchanged except escalation logic reuse
# -----------------------------------------------------------------------------
@app.websocket("/ws/session/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    connection_id = f"session_{session_id}_{uuid.uuid4().hex[:8]}"

    try:
        await manager.connect(websocket, connection_id)
        manager.session_connections[session_id] = connection_id
        print(f"[WS] Customer connected to session {session_id}")

        if session_id in chat_sessions:
            session = chat_sessions[session_id]
            status_message = {
                "type": "session_status",
                "escalated": session.get("escalated", False),
                "agent_id": session.get("agent_id"),
                "message_count": len(session.get("history", []))
            }
            await manager.send_personal_message(json.dumps(status_message), connection_id)

        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data["type"] == "user_message":
                user_message = (message_data["message"] or "").strip()

                # init
                if session_id not in chat_sessions:
                    chat_sessions[session_id] = {
                        "history": [],
                        "escalated": False,
                        "agent_id": None,
                        "escalated_at": None,
                        "confidence_scores": [],
                        "low_confidence_streak": 0,
                    }

                session = chat_sessions[session_id]

                # append user message
                user_msg = {"role": "user", "content": user_message, "timestamp": datetime.now().isoformat()}
                session["history"].append(user_msg)

                # if already escalated, just pass through to agent without repeating notices
                if session.get("escalated"):
                    agent_id = session.get("agent_id")
                    if agent_id and agent_id in human_agent_sessions:
                        agent_message = {
                            "type": "user_message",
                            "session_id": session_id,
                            "message": user_message,
                            "timestamp": datetime.now().isoformat()
                        }
                        await manager.broadcast_to_agent(json.dumps(agent_message), agent_id)
                    # Do not send repetitive bot notices to the customer
                    continue

                # RAG
                retrieved_docs = retrieve_context(user_message, k=4)
                context_text = "\n".join([doc.page_content for doc in retrieved_docs])

                # prompt + LLM
                system_prompt = build_system_prompt(context_text)
                messages = [{"role": "system", "content": system_prompt}] + session["history"]
                response = chat_with_groq(messages)
                bot_reply = response.content.strip()

                confidence_score = get_confidence_score(bot_reply)
                bot_reply_clean = bot_reply.replace(f"[CONFIDENCE: {confidence_score}]", "").strip()

                try:
                    confidence = float(confidence_score)
                except Exception:
                    confidence = 0.0

                context_is_empty = not context_text.strip()
                retrieved_count = len(retrieved_docs)
                if not context_is_empty and retrieved_count > 0 and confidence < 0.35:
                    confidence = 0.35

                # two-strike tracking
                streak = session.get("low_confidence_streak", 0)
                if confidence < 0.25:
                    streak += 1
                else:
                    streak = 0
                session["low_confidence_streak"] = streak

                explicit_intent = user_wants_human_agent(user_message)

                should_escalate = (
                    explicit_intent or
                    (
                        confidence < 0.2 and
                        (context_is_empty or retrieved_count == 0) and
                        streak >= 2
                    )
                )

                if should_escalate and not session["escalated"]:
                    print("[ESCALATE][WS]", "explicit_user_request" if explicit_intent else f"auto_low_conf (conf={confidence:.2f}, streak={streak}, ctx_empty={context_is_empty})")
                    agent_id = escalate_to_human(session_id, session)
                    out = {
                        "type": "bot_message",
                        "message": f"Thank you. I'm connecting you to a human agent now. Your session ID is: {session_id}",
                        "escalated": True,
                        "agent_id": agent_id,
                        "confidence_score": confidence
                    }
                    await manager.send_personal_message(json.dumps(out), connection_id)

                    # notify agent
                    await manager.broadcast_to_agent(json.dumps({
                        "type": "new_escalated_session",
                        "session_id": session_id,
                        "agent_id": agent_id,
                        "message": f"New escalated session: {session_id}"
                    }), agent_id)
                else:
                    # normal bot message
                    bot_msg = {
                        "role": "assistant",
                        "content": bot_reply_clean,
                        "confidence": confidence,
                        "timestamp": datetime.now().isoformat()
                    }
                    session["history"].append(bot_msg)
                    session["confidence_scores"].append(confidence)

                    # send bot reply to the customer widget
                    await manager.send_personal_message(json.dumps({
                        "type": "bot_message",
                        "message": bot_reply_clean,
                        "escalated": False,
                        "confidence_score": confidence,
                        "timestamp": bot_msg["timestamp"]
                    }), connection_id)

            elif message_data["type"] == "typing":
                # forward typing indicator from customer to agent if escalated
                if session_id in chat_sessions and chat_sessions[session_id].get("escalated"):
                    agent_id = chat_sessions[session_id].get("agent_id")
                    if agent_id and agent_id in human_agent_sessions:
                        await manager.broadcast_to_agent(json.dumps({
                            "type": "user_typing",
                            "session_id": session_id,
                            "timestamp": datetime.now().isoformat()
                        }), agent_id)
                # removed incorrect bot response send here

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        print(f"[WS] Customer disconnected from session {session_id}")


@app.websocket("/ws/agent/{agent_id}")
async def websocket_agent(websocket: WebSocket, agent_id: str):
    connection_id = f"agent_{agent_id}_{uuid.uuid4().hex[:8]}"

    try:
        await manager.connect(websocket, connection_id)
        manager.agent_connections[agent_id] = connection_id
        print(f"[WS] Agent {agent_id} connected")

        # send waiting sessions
        escalated_sessions = []
        for aid, session_data in human_agent_sessions.items():
            if session_data["status"] == "waiting":
                escalated_sessions.append({
                    "agent_id": aid,
                    "session_id": session_data["session_id"],
                    "escalated_at": session_data["escalated_at"],
                    "message_count": len(session_data["history"])
                })

        await manager.send_personal_message(json.dumps({
            "type": "agent_status",
            "agent_id": agent_id,
            "escalated_sessions": escalated_sessions
        }), connection_id)

        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data["type"] == "agent_message":
                session_id = message_data["session_id"]
                agent_message = message_data["message"]

                if agent_id not in human_agent_sessions:
                    await manager.send_personal_message(json.dumps({"type": "error", "message": "Invalid agent ID or session not found"}), connection_id)
                    continue

                agent_session = human_agent_sessions[agent_id]
                if agent_session["session_id"] != session_id:
                    await manager.send_personal_message(json.dumps({"type": "error", "message": "Agent not authorized for this session"}), connection_id)
                    continue

                if session_id in chat_sessions:
                    chat_sessions[session_id]["history"].append({
                        "role": "agent",
                        "content": agent_message,
                        "timestamp": datetime.now().isoformat(),
                        "agent_id": agent_id
                    })
                    agent_session["status"] = "active"
                    agent_session["history"].append({
                        "role": "agent",
                        "content": agent_message,
                        "timestamp": datetime.now().isoformat()
                    })

                await manager.broadcast_to_session(json.dumps({
                    "type": "agent_message",
                    "message": agent_message,
                    "agent_id": agent_id,
                    "timestamp": datetime.now().isoformat()
                }), session_id)

                await manager.send_personal_message(json.dumps({
                    "type": "message_sent",
                    "session_id": session_id,
                    "message": "Message sent successfully"
                }), connection_id)

            elif message_data["type"] == "user_message":
                session_id = message_data["session_id"]
                user_message = message_data["message"]

                if agent_id not in human_agent_sessions:
                    await manager.send_personal_message(json.dumps({"type": "error", "message": "Invalid agent ID or session not found"}), connection_id)
                    continue

                agent_session = human_agent_sessions[agent_id]
                if agent_session["session_id"] != session_id:
                    await manager.send_personal_message(json.dumps({"type": "error", "message": "Agent not authorized for this session"}), connection_id)
                    continue

                await manager.send_personal_message(json.dumps({
                    "type": "user_message",
                    "session_id": session_id,
                    "message": user_message,
                    "timestamp": message_data.get("timestamp", datetime.now().isoformat())
                }), connection_id)

            elif message_data["type"] == "typing":
                # Agent typing indicator → forward to session
                # Determine session_id from message (preferred) or agent_session
                session_id = message_data.get("session_id")
                if not session_id and agent_id in human_agent_sessions:
                    session_id = human_agent_sessions[agent_id].get("session_id")
                if not session_id:
                    continue
                await manager.broadcast_to_session(json.dumps({
                    "type": "agent_typing",
                    "session_id": session_id,
                    "timestamp": datetime.now().isoformat()
                }), session_id)

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        print(f"[WS] Agent {agent_id} disconnected")


# Boot-time restore of escalations
load_escalated_sessions_from_db()
