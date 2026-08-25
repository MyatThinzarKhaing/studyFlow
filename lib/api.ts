import type { Flashcard } from '@/types'

export const API_URL = 'http://localhost:8000'

export async function uploadPDF(file: File): Promise<unknown> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_URL}/upload-pdf/`, { method: 'POST', body: formData })
  if (!response.ok) throw new Error('PDF upload failed')
  return response.json()
}

export async function getFlashcards(): Promise<Flashcard[]> {
  const response = await fetch(`${API_URL}/flashcards/`)
  if (!response.ok) throw new Error('Could not load flashcards')
  return response.json()
}
