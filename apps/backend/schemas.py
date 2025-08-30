from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    role: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str

class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str = "employee"  # Default to employee

# Chat schemas (existing ones)
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

# Bot testing schemas
class BotTestRequest(BaseModel):
    message: str
    expected_response: Optional[str] = None
    test_category: Optional[str] = None  # e.g., "general", "technical", "support"
    context_documents: Optional[List[str]] = None  # Optional context for testing

class BotTestResponse(BaseModel):
    bot_response: str
    confidence_score: float
    response_time_ms: int
    context_used: List[str]
    retrieved_documents: int
    test_id: str
    timestamp: datetime

class BotAccuracyTest(BaseModel):
    test_cases: List[BotTestRequest]
    test_name: str
    description: Optional[str] = None

class BotAccuracyResult(BaseModel):
    test_name: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    average_confidence: float
    average_response_time: float
    accuracy_percentage: float
    detailed_results: List[BotTestResponse]
    timestamp: datetime

class BotValidationRequest(BaseModel):
    message: str
    expected_keywords: Optional[List[str]] = None
    expected_sentiment: Optional[str] = None  # "positive", "negative", "neutral"
    max_response_time: Optional[int] = None  # Maximum acceptable response time in ms
