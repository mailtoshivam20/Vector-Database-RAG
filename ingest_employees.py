"""Loads employee-website/employees.json into the Chroma vector DB used by the chatbot.

Run:  python ingest_employees.py
Re-running replaces the previously ingested employee records.
"""
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

load_dotenv(override=True)

ROOT = Path(__file__).parent
DB_NAME = str(ROOT.parent / "vector_db")  # same location as Vector Database RAG.py
SOURCE = "employees.json"

employees = json.loads((ROOT / "employee-website" / SOURCE).read_text(encoding="utf-8"))

docs = [
    Document(
        page_content=(
            f"Employee: {e['name']}\n"
            f"Role: {e['role']}\n"
            f"Department: {e['department']}\n"
            f"Email: {e['email']}\n"
            f"Phone: {e['phone']}\n"
            f"Location: {e['location']}\n"
            f"Joined Insurellm: {e['joined']}\n"
            f"Skills: {', '.join(e['skills'])}\n"
            f"About: {e['bio']}"
        ),
        metadata={"source": SOURCE, "type": "employee", "name": e["name"]},
    )
    for e in employees
]

store = Chroma(
    persist_directory=DB_NAME,
    embedding_function=OpenAIEmbeddings(model="text-embedding-3-large", api_key=os.getenv("OPENAI_API_KEY")),
)
old = store.get(where={"source": SOURCE})["ids"]
if old:
    store.delete(ids=old)
store.add_documents(docs)
print(f"Ingested {len(docs)} employees into {DB_NAME}")
