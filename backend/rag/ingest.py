from pypdf import PdfReader
from rag.embedder import get_embedding
from rag.vectorstore import add_vectors, save_index
import json

CHUNK_SIZE = 800
OVERLAP = 150


def chunk_text(text):
    """
    Split text into overlapping chunks (better retrieval quality)
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start += CHUNK_SIZE - OVERLAP

    return chunks


def ingest_pdf(file):
    """
    PDF → text → chunks → embeddings → FAISS
    """

    reader = PdfReader(file)
    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    if not text.strip():
        raise ValueError("No text found in PDF")

    chunks = chunk_text(text)

    # convert to embeddings
    embeddings = [get_embedding(c) for c in chunks]

    # store in vector DB
    add_vectors(embeddings, chunks)
    save_index()

    # optional backup file
    with open("data/chunks.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f)

    return len(chunks)