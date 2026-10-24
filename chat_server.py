"""Serves the employee website and exposes the Insurellm RAG chatbot at /api/chat.
Everything except the login page requires a signed-in session.

Run:  uvicorn chat_server:app --port 8085
Add a user:  python create_user.py <username>
"""
import base64
import hashlib
import hmac
import importlib.util
import json
import os
import re
import secrets
import threading
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from app_logging import log_chat, log_event

load_dotenv(override=True)

ROOT = Path(__file__).parent
SITE = ROOT / "employee-website"
USERS_FILE = ROOT / "users.json"

COOKIE = "session"
SESSION_SECONDS = 8 * 3600
# Set SESSION_SECRET in .env to keep sessions valid across restarts.
SECRET = (os.getenv("SESSION_SECRET") or secrets.token_hex(32)).encode()
PUBLIC_PATHS = {"/login", "/api/login", "/register", "/api/register", "/styles.css"}
MAX_FAILS, LOCKOUT_SECONDS = 5, 300
failed: dict[str, list[float]] = {}
signups: dict[str, list[float]] = {}
MAX_SIGNUPS = 5
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.@-]{3,40}$")
users_lock = threading.Lock()

# The RAG script has a space in its filename, so load it by path.
spec = importlib.util.spec_from_file_location("rag", ROOT / "Vector Database RAG.py")
rag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rag)

app = FastAPI()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def hash_password(password: str, salt: bytes) -> str:
    return hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def load_users() -> dict:
    return json.loads(USERS_FILE.read_text()) if USERS_FILE.exists() else {}


def save_user(username: str, password: str, overwrite: bool = False) -> bool:
    """Store a hashed password. Returns False if the user exists and overwrite is off."""
    with users_lock:
        users = load_users()
        if username in users and not overwrite:
            return False
        salt = os.urandom(16)
        users[username] = {"salt": salt.hex(), "hash": hash_password(password, salt)}
        USERS_FILE.write_text(json.dumps(users, indent=2))
    return True


def check_password(username: str, password: str) -> bool:
    users = load_users()
    user = users.get(username)
    salt = bytes.fromhex(user["salt"]) if user else b"\0" * 16  # same work either way
    digest = hash_password(password, salt)
    return bool(user) and hmac.compare_digest(digest, user["hash"])


def sign(value: str) -> str:
    return hmac.new(SECRET, value.encode(), hashlib.sha256).hexdigest()


def make_token(username: str) -> str:
    payload = base64.urlsafe_b64encode(f"{username}|{int(time.time()) + SESSION_SECONDS}".encode()).decode()
    return f"{payload}.{sign(payload)}"


def current_user(request: Request) -> str | None:
    token = request.cookies.get(COOKIE, "")
    payload, _, sig = token.partition(".")
    if not payload or not hmac.compare_digest(sig, sign(payload)):
        return None
    try:
        username, expires = base64.urlsafe_b64decode(payload).decode().rsplit("|", 1)
    except ValueError:
        return None
    return username if int(expires) > time.time() else None


@app.middleware("http")
async def require_login(request: Request, call_next):
    user = current_user(request)
    request.state.user = user
    if request.url.path in PUBLIC_PATHS or user:
        return await call_next(request)
    if request.url.path.startswith("/api/"):
        log_event("unauthorized_api", ip=client_ip(request), detail=request.url.path, level="WARNING")
        return JSONResponse({"detail": "Not signed in"}, status_code=401)
    return RedirectResponse("/login")


class Login(BaseModel):
    username: str
    password: str


class Register(Login):
    pass


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[Message] = []


@app.get("/login")
def login_page():
    return FileResponse(SITE / "login.html")


@app.get("/register")
def register_page():
    return FileResponse(SITE / "register.html")


def start_session(response: Response, username: str):
    response.set_cookie(COOKIE, make_token(username), max_age=SESSION_SECONDS,
                        httponly=True, samesite="lax")


@app.post("/api/register")
def register(body: Register, request: Request, response: Response):
    ip = client_ip(request)
    now = time.time()
    recent = [t for t in signups.get(ip, []) if now - t < LOCKOUT_SECONDS]
    if len(recent) >= MAX_SIGNUPS:
        log_event("register_rate_limited", ip=ip, level="WARNING")
        raise HTTPException(429, "Too many sign-ups. Try again in a few minutes.")
    username = body.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(400, "Username must be 3-40 characters: letters, numbers, . _ @ -")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    signups[ip] = recent + [now]
    if not save_user(username, body.password):
        log_event("register_failed", username, ip, "username taken", "WARNING")
        raise HTTPException(409, "That username is already taken")
    start_session(response, username)
    log_event("register", username, ip)
    return {"ok": True}


@app.post("/api/login")
def login(body: Login, request: Request, response: Response):
    ip = client_ip(request)
    now = time.time()
    recent = [t for t in failed.get(ip, []) if now - t < LOCKOUT_SECONDS]
    failed[ip] = recent
    if len(recent) >= MAX_FAILS:
        log_event("login_locked_out", body.username.strip(), ip, level="WARNING")
        raise HTTPException(429, "Too many attempts. Try again in a few minutes.")
    if not check_password(body.username.strip(), body.password):
        recent.append(now)
        log_event("login_failed", body.username.strip(), ip, level="WARNING")
        raise HTTPException(401, "Invalid username or password")
    failed.pop(ip, None)
    start_session(response, body.username.strip())
    log_event("login", body.username.strip(), ip)
    return {"ok": True}


@app.post("/api/logout")
def logout(request: Request, response: Response):
    log_event("logout", request.state.user, client_ip(request))
    response.delete_cookie(COOKIE)
    return {"ok": True}


@app.post("/api/chat")
def chat(req: ChatRequest, request: Request):
    question = req.question.strip()
    if not question:
        raise HTTPException(400, "Question is empty")
    history = [m.model_dump() for m in req.history[-10:]]
    user, ip, started = request.state.user, client_ip(request), time.time()
    try:
        answer, docs = rag.answer_question(question, history)
    except Exception as exc:
        log_chat(user, ip, question, None, [], int((time.time() - started) * 1000), error=str(exc))
        raise HTTPException(500, f"Chatbot error: {exc}")
    sources = sorted({Path(d.metadata.get("source", "")).name for d in docs if d.metadata.get("source")})
    log_chat(user, ip, question, answer, sources, int((time.time() - started) * 1000))
    return {"answer": answer, "sources": sources}


app.mount("/", StaticFiles(directory=SITE, html=True), name="site")
