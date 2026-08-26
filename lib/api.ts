const API_URL = "http://localhost:8000";

export async function uploadPDF(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload-pdf/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let detail = "Failed to upload and process PDF";

    try {
      const body = await res.json();
      if (typeof body?.detail === "string" && body.detail.trim()) {
        detail = body.detail;
      }
    } catch {
      // Keep the fallback message when the backend does not return JSON.
    }

    throw new Error(detail);
  }
  
  // Optionally return the response JSON containing flashcards if your backend sends them back directly
  return await res.json();
}

export async function fetchFlashcards() {
  const res = await fetch(`${API_URL}/flashcards/`);
  if (!res.ok) throw new Error("Failed to fetch flashcards");
  return await res.json();
}