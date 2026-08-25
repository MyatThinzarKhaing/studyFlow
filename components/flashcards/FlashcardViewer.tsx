'use client'
import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw, Brain } from 'lucide-react'
import { PageTitle } from '@/components/layout/AppShell'
import type { Flashcard } from '@/types'
import { fetchFlashcards } from '@/lib/api'

const fallback: Flashcard[] = [
  { question: 'What is the nature–nurture debate?', answer: 'The debate about whether behavior is determined primarily by genes (nature) or environment and experience (nurture).' },
  { question: 'What is a hypothesis?', answer: 'A testable prediction about the relationship between variables.' },
  { question: 'What does replication mean?', answer: 'Repeating a study to see if the original findings can be reproduced.' }
]

export function FlashcardViewer() {
  const [index, setIndex] = useState(0)
  const [flip, setFlip] = useState(false)
  const [cards, setCards] = useState<Flashcard[]>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try loading generated cards from backend or local storage cache
    fetchFlashcards()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCards(data)
        }
      })
      .catch(() => {
        // Fall back to local storage if API fails or isn't reached
        const cached = localStorage.getItem('generated_flashcards')
        if (cached) {
          try { setCards(JSON.parse(cached)) } catch (e) {}
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const next = (d: number) => {
    setIndex((index + d + cards.length) % cards.length)
    setFlip(false)
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading flashcards...</div>
  }

  return (
    <div className="flex flex-col gap-8">
      <PageTitle eyebrow={`Flashcards · ${cards.length} cards`} title="Active recall" action="Shuffle deck" />
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
        <div className="flex w-full justify-between text-sm text-muted-foreground">
          <span>Card {index + 1} of {cards.length}</span>
          <span>{Math.round(((index + 1) / cards.length) * 100)}% complete</span>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
        <button 
          onClick={() => setFlip(!flip)} 
          className="mt-8 flex min-h-80 w-full flex-col items-center justify-center rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-lg transition hover:scale-[1.01]"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60">{flip ? 'Answer' : 'Question'}</span>
          <span className="mt-7 max-w-lg text-2xl font-semibold leading-snug">
            {cards[index][flip ? 'answer' : 'question']}
          </span>
          <span className="mt-8 flex items-center gap-2 text-sm text-primary-foreground/60">
            <RotateCcw className="size-4" />Click to flip
          </span>
        </button>
        <div className="mt-6 flex w-full items-center justify-between">
          <button disabled={!index} onClick={() => next(-1)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">
            <ArrowLeft className="size-4" />Previous
          </button>
          <button onClick={() => next(1)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Next<ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}