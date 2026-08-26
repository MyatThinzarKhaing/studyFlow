from rag.embedder import get_embedding
from rag.vectorstore import search, ensure_index


def retrieve_relevant_chunks(query, top_k=3):
    """
    Semantic retrieval (ChatGPT-style context builder)
    """

    # safety check
    ensure_index()

    if not query:
        return "No query provided."

    query_vector = get_embedding(query)

    results = search(query_vector, top_k=top_k)

    if not results:
        return "No relevant knowledge found. Please upload a PDF first."

    # clean context formatting (important for LLM quality)
    return "\n\n".join(
        [f"- {r.strip()}" for r in results if r]
    )