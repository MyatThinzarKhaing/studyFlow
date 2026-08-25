export type Flashcard = { question: string; answer: string }
export type QuizQuestion = { question: string; options: string[]; answer: string; explanation: string }
export type ChatMessage = { role: 'ai' | 'user'; text: string }
export type StudyMode = 'home' | 'summary' | 'flashcards' | 'quiz' | 'tutor'
