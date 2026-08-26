from sentence_transformers import SentenceTransformer
import numpy as np

# Lightweight + fast + production safe
model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embedding(text: str):
    """
    Convert text → normalized vector (FAISS-ready)
    """
    if not text:
        return np.zeros(384)

    embedding = model.encode(text, normalize_embeddings=True)
    return embedding