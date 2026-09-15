"""
Authentication routes — register and login with JWT tokens.
"""
import uuid
import logging
import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from backend.db.database import get_connection
from backend.api.deps import create_access_token, get_current_user

logger = logging.getLogger("researchmind.api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    """Create a new user account and return a JWT token."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address.")

    conn = get_connection()
    try:
        # Check if email already exists
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        user_id = str(uuid.uuid4())
        hashed = hash_password(req.password)
        conn.execute(
            "INSERT INTO users (id, email, hashed_password) VALUES (?, ?, ?)",
            (user_id, email, hashed),
        )
        conn.commit()
        logger.info(f"New user registered: {email}")

        token = create_access_token({"sub": user_id, "email": email})
        return AuthResponse(token=token, user_id=user_id, email=email)
    finally:
        conn.close()


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    """Authenticate and return a JWT token."""
    email = req.email.strip().lower()

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, email, hashed_password FROM users WHERE email = ?", (email,)
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not verify_password(req.password, row["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        user_id = row["id"]
        token = create_access_token({"sub": user_id, "email": row["email"]})
        logger.info(f"User logged in: {email}")
        return AuthResponse(token=token, user_id=user_id, email=row["email"])
    finally:
        conn.close()


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    """Return the current authenticated user's info."""
    return {"user_id": user["user_id"], "email": user["email"]}

