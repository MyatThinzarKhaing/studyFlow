import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from groq import Groq
import json

app = FastAPI()

# Enable CORS so your Next.js frontend can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client (ensure GROQ_API_KEY is set in your environment variables)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# In-memory storage for the latest generated flashcards (or use a database/cache)
latest_flashcards = []

class Flashcard(BaseModel):
    question: str
    answer: str

@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    global latest_flashcards
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    try:
        # Read PDF content using pypdf
        reader = PdfReader(file.file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        # Limit text size if necessary to fit context windows
        trimmed_text = text[:15000] 

        # Call Groq API to generate flashcards
        prompt = (
            "Based on the following text extracted from a PDF, generate a list of educational flashcards. "
            "Return ONLY a valid JSON array of objects with 'question' and 'answer' keys. No extra markdown, no introduction.\n\n"
            f"Text:\n{trimmed_text}"
        )

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful study assistant that creates concise, high-quality flashcards in JSON format."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-20b",  # Or your preferred Groq model
            temperature=0.3,
            response_format={"type": "json_object"} # Depending on structure, or parse manually
        )

        response_content = chat_completion.choices[0].message.content
        
        # Parse the JSON response from Groq
        parsed_data = json.loads(response_content)
        
        # Handle cases where model wraps it in an object like {"flashcards": [...]}
        if isinstance(parsed_data, dict):
            for key, value in parsed_data.items():
                if isinstance(value, list):
                    latest_flashcards = value
                    break
        elif isinstance(parsed_data, list):
            latest_flashcards = parsed_data

        return {"message": "PDF processed and flashcards generated successfully", "count": len(latest_flashcards)}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/flashcards/")
async def get_flashcards():
    return latest_flashcards

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)