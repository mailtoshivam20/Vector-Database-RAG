"""Serves the employee website and exposes the Insurellm RAG chatbot at /api/chat.

Run:  uvicorn chat_server:app --port 8085
"""
import importlib.util
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).parent

# The RAG script has a space in its filename, so load it by path.
spec = importlib.util.spec_from_file_location("rag", ROOT / "Vector Database RAG.py")
rag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rag)

app = FastAPI()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[Message] = []


@app.post("/api/chat")
def chat(req: ChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(400, "Question is empty")
    history = [m.model_dump() for m in req.history[-10:]]
    try:
        answer, docs = rag.answer_question(question, history)
    except Exception as exc:
        raise HTTPException(500, f"Chatbot error: {exc}")
    sources = sorted({Path(d.metadata.get("source", "")).name for d in docs if d.metadata.get("source")})
    return {"answer": answer, "sources": sources}


app.mount("/", StaticFiles(directory=ROOT / "employee-website", html=True), name="site")
