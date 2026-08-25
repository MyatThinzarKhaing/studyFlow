const API_URL = "http://localhost:8000";

export async function uploadPDF(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload-pdf/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload and process PDF");
  
  // Optionally return the response JSON containing flashcards if your backend sends them back directly
  return await res.json();
}

export async function fetchFlashcards() {
  const res = await fetch(`${API_URL}/flashcards/`);
  if (!res.ok) throw new Error("Failed to fetch flashcards");
  return await res.json();
}