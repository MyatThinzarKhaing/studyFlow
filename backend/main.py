import os
import json
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from groq import Groq
from dotenv import load_dotenv

# =========================
# ENV
# =========================
load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# =========================
# STORAGE
# =========================
latest_flashcards = []
pdf_chunks = []
tutor_history: List[dict] = []

# =========================
# CLEAN TEXT
# =========================
def clean_text(text):
    return (
        text.replace("â€“", "—")
            .replace("â€”", "—")
            .replace("â€˜", "'")
            .replace("â€™", "'")
            .replace("â€œ", '"')
            .replace("â€�", '"')
            .replace("â", "→")
    )

# =========================
# CHUNKING
# =========================
def simple_chunk(text, chunk_size=800):
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

# =========================
# RETRIEVAL (FIXED RAG)
# =========================
def retrieve_relevant_chunks(query: str, top_k: int = 3):
    if not pdf_chunks:
        return "No document uploaded."

    query_words = query.lower().split()
    scored = []

    for chunk in pdf_chunks:
        score = sum(1 for w in query_words if w in chunk.lower())
        scored.append((score, chunk))

    scored.sort(reverse=True, key=lambda x: x[0])

    return "\n\n".join([c for _, c in scored[:top_k]])

# =========================
# MODELS
# =========================
class Flashcard(BaseModel):
    question: str
    answer: str

class TutorRequest(BaseModel):
    question: str

# =========================
# PDF UPLOAD + FLASHCARDS
# =========================
@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    global latest_flashcards, pdf_chunks

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        reader = PdfReader(file.file)
        text = ""

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        trimmed_text = text[:15000]

        # chunk for RAG
        pdf_chunks = simple_chunk(text)

        prompt = f"""
Based on the following text, generate flashcards.
Return ONLY JSON array with question & answer.

Text:
{trimmed_text}
"""

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You generate clean flashcards in JSON only."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-20b",
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        response_content = chat_completion.choices[0].message.content
        parsed = json.loads(response_content)

        if isinstance(parsed, dict):
            for v in parsed.values():
                if isinstance(v, list):
                    latest_flashcards = v
                    break
        elif isinstance(parsed, list):
            latest_flashcards = parsed

        return {
            "message": "PDF processed successfully",
            "flashcards": len(latest_flashcards)
        }

    except Exception as e:
        print("Upload Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# GET FLASHCARDS
# =========================
@app.get("/flashcards/")
async def get_flashcards():
    return latest_flashcards

# =========================
# TUTOR CHAT
# =========================
@app.post("/tutor/ask/")
async def tutor_ask(data: TutorRequest):
    global tutor_history

    try:
        context = retrieve_relevant_chunks(data.question, top_k=3)

        prompt = f"""
You are an AI tutor.

RULES:
- Short answers only
- Bullet points allowed
- No copying long text

CONTEXT:
{context}

HISTORY:
{tutor_history[-5:]}

QUESTION:
{data.question}

ANSWER:
"""

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise tutor."
                },
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-20b",
            temperature=0.3,
        )

        answer = chat_completion.choices[0].message.content
        answer = clean_text(answer)

        tutor_history.append({
            "question": data.question,
            "answer": answer
        })

        return {"answer": answer}

    except Exception as e:
        print("Tutor Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# HISTORY
# =========================
@app.get("/tutor/history/")
async def get_tutor_history():
    return tutor_history

# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)