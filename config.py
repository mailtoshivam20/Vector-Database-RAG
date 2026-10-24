"""Central settings for the chat server (one place instead of constants scattered in code)."""
import os
import secrets

from dotenv import load_dotenv

load_dotenv(override=True)

# Sessions
COOKIE_NAME = "session"
SESSION_SECONDS = 8 * 3600
# Set SESSION_SECRET in .env to keep sessions valid across restarts.
SESSION_SECRET = (os.getenv("SESSION_SECRET") or secrets.token_hex(32)).encode()
# Set COOKIE_SECURE=true in .env when serving over HTTPS.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# Rate limiting (per client address)
RATE_WINDOW_SECONDS = 300
MAX_FAILED_LOGINS = 5
MAX_SIGNUPS = 5

# Chat
MAX_HISTORY_MESSAGES = 10

# Security headers added to every response
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Cache-Control": "no-store",
}
