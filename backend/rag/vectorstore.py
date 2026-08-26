import faiss
import numpy as np
import os

INDEX_PATH = "data/index.faiss"
DIM = 384

index = faiss.IndexFlatIP(DIM)
chunks = []  # stores text mapped to vectors


def ensure_index():
    """
    Load index if exists, otherwise create new one
    """
    global index

    os.makedirs("data", exist_ok=True)

    if os.path.exists(INDEX_PATH):
        index = faiss.read_index(INDEX_PATH)
        return True

    index = faiss.IndexFlatIP(DIM)
    faiss.write_index(index, INDEX_PATH)
    return False


def add_vectors(vectors, texts):
    """
    Store embeddings + corresponding text chunks
    """
    global chunks

    vectors = np.array(vectors).astype("float32")
    index.add(vectors)

    chunks.extend(texts)


def save_index():
    """
    Persist FAISS index
    """
    faiss.write_index(index, INDEX_PATH)


def search(query_vector, top_k=3):
    """
    Semantic search using FAISS
    """
    if index.ntotal == 0:
        return []

    query_vector = np.array([query_vector]).astype("float32")

    scores, indices = index.search(query_vector, top_k)

    results = []
    for i in indices[0]:
        if i < len(chunks) and i >= 0:
            results.append(chunks[i])

    return results