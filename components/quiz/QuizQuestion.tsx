'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Gauge,
  Loader2,
  X,
  RotateCcw,
  Trophy,
} from 'lucide-react'
import { PageTitle } from '@/components/layout/AppShell'
import Groq from 'groq-sdk'

interface QuizQuestionData {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface QuizData {
  questions: QuizQuestionData[]
}

export function QuizQuestion() {
  const [quiz, setQuiz] = useState<QuizData | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] =
    useState<number | null>(null)

  const [submitted, setSubmitted] = useState(false)

  const [answers, setAnswers] =
    useState<(number | null)[]>([])

  const [finished, setFinished] = useState(false)

  // =========================================================
  // GENERATE QUIZ
  // =========================================================

  const generateQuiz = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setRetrying(false)

      // -----------------------------------------------------
      // GET PDF
      // -----------------------------------------------------

      const pdfText =
        sessionStorage.getItem('studyflow_pdf_text')

      const fileName =
        sessionStorage.getItem('studyflow_pdf_name') ||
        'Current document'

      if (!pdfText || pdfText.trim().length < 50) {
        throw new Error(
          'No PDF content was found. Please upload a PDF from the Home page first.'
        )
      }

      // -----------------------------------------------------
      // API KEY
      // -----------------------------------------------------

      const apiKey =
        process.env.NEXT_PUBLIC_GROQ_API_KEY ||
        (
          import.meta as unknown as {
            env?: {
              VITE_GROQ_API_KEY?: string
            }
          }
        ).env?.VITE_GROQ_API_KEY

      if (!apiKey) {
        throw new Error(
          'Groq API Key is missing from environment variables.'
        )
      }

      const groq = new Groq({
        apiKey,
        dangerouslyAllowBrowser: true,
      })

      // -----------------------------------------------------
      // DETERMINE QUIZ SIZE
      // -----------------------------------------------------

      const textLength = pdfText.trim().length

      let questionRange = '10-12'

      if (textLength < 12000) {
        questionRange = '10-12'
      } else if (textLength < 30000) {
        questionRange = '12-17'
      } else {
        questionRange = '17-25'
      }

      // -----------------------------------------------------
      // COMPACT PROMPT
      // -----------------------------------------------------

      const systemPrompt = `
You are a university exam question generator.

Create a high-quality multiple-choice practice exam from the academic document.

QUESTION COUNT:
- Very short document: 10-12
- Small document: 10-12
- Medium document: 12-17
- Large document: 17-25
- Never fewer than 10
- Never more than 25

For this document use ${questionRange} questions.

RULES:
1. Use ONLY information from the document.
2. Cover important topics broadly.
3. Focus on definitions, concepts, processes, comparisons,
   relationships, applications, formulas and exam-relevant details.
4. Test understanding rather than copying sentences.
5. Avoid trick or ambiguous questions.
6. Every question must have exactly 4 options.
7. Only one option is correct.
8. Incorrect options should be plausible.
9. Keep explanations VERY short.
10. Do not repeat concepts unnecessarily.
11. Keep questions and options concise.

Return ONLY valid JSON:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": 0,
      "explanation": "Short explanation."
    }
  ]
}

correctAnswer:
0 = A
1 = B
2 = C
3 = D
`

      // -----------------------------------------------------
      // LIMIT DOCUMENT SIZE
      // -----------------------------------------------------

      const documentText = pdfText.slice(0, 5500)

      const userPrompt = `
Create a university practice exam from this document.

Document name:
${fileName}

Generate ${questionRange} questions.

Make the questions useful for university exam preparation.
Cover the most important concepts without unnecessary repetition.

DOCUMENT:

${documentText}
`

      // -----------------------------------------------------
      // RETRY GROQ REQUEST
      // -----------------------------------------------------

      let response = null

      const maxAttempts = 3

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        try {
          response =
            await groq.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                {
                  role: 'user',
                  content: userPrompt,
                },
              ],

              // KEEP YOUR MODEL
              model: 'openai/gpt-oss-20b',

              temperature: 0.2,

              /*
               * IMPORTANT:
               * Smaller output reduces TPM usage.
               */
              max_tokens: 2600,

              response_format: {
                type: 'json_object',
              },
            })

          break
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : String(err)

          const isRateLimit =
            message.includes('429') ||
            message
              .toLowerCase()
              .includes('rate limit') ||
            message
              .toLowerCase()
              .includes('tokens per minute')

          if (!isRateLimit) {
            throw err
          }

          // -----------------------------------------------
          // RATE LIMIT HANDLING
          // -----------------------------------------------

          if (attempt === maxAttempts) {
            throw new Error(
              'The quiz service is temporarily busy. Please wait a little and try again.'
            )
          }

          setRetrying(true)

          /*
           * Wait before trying again.
           *
           * Attempt 1 → 15 seconds
           * Attempt 2 → 20 seconds
           */

          const waitTime =
            attempt === 1 ? 15000 : 20000

          await new Promise((resolve) =>
            setTimeout(resolve, waitTime)
          )

          setRetrying(false)
        }
      }

      // -----------------------------------------------------
      // CHECK RESPONSE
      // -----------------------------------------------------

      if (!response) {
        throw new Error(
          'The quiz service did not return a response.'
        )
      }

      const content =
        response.choices[0]?.message?.content

      if (!content) {
        throw new Error(
          'No quiz was returned from the AI.'
        )
      }

      // -----------------------------------------------------
      // PARSE JSON
      // -----------------------------------------------------

      const parsed: QuizData =
        JSON.parse(content)

      // -----------------------------------------------------
      // VALIDATE
      // -----------------------------------------------------

      if (
        !parsed.questions ||
        !Array.isArray(parsed.questions)
      ) {
        throw new Error(
          'The AI returned an invalid quiz.'
        )
      }

      if (
        parsed.questions.length < 10 ||
        parsed.questions.length > 25
      ) {
        throw new Error(
          'The generated quiz has an invalid number of questions.'
        )
      }

      const validQuestions =
        parsed.questions.filter(
          (question) =>
            typeof question.question ===
              'string' &&
            question.question.trim().length > 0 &&
            Array.isArray(question.options) &&
            question.options.length === 4 &&
            question.options.every(
              (option) =>
                typeof option === 'string' &&
                option.trim().length > 0
            ) &&
            typeof question.correctAnswer ===
              'number' &&
            question.correctAnswer >= 0 &&
            question.correctAnswer <= 3 &&
            typeof question.explanation ===
              'string'
        )

      if (
        validQuestions.length !==
        parsed.questions.length
      ) {
        throw new Error(
          'Some generated questions were invalid.'
        )
      }

      // -----------------------------------------------------
      // SAVE QUIZ
      // -----------------------------------------------------

      setQuiz({
        questions: validQuestions,
      })

      setAnswers(
        new Array(validQuestions.length).fill(null)
      )

      setCurrentQuestion(0)
      setSelectedAnswer(null)
      setSubmitted(false)
      setFinished(false)
      setError(null)
    } catch (err: unknown) {
      console.error(
        '[Quiz] Generation error:',
        err
      )

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          'Unable to generate the quiz right now.'
        )
      }
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [])

  // =========================================================
  // INITIAL GENERATION
  // =========================================================

  useEffect(() => {
    generateQuiz()
  }, [generateQuiz])

  // =========================================================
  // SUBMIT ANSWER
  // =========================================================

  const handleSubmit = () => {
    if (
      !quiz ||
      selectedAnswer === null
    ) {
      return
    }

    const updatedAnswers = [...answers]

    updatedAnswers[currentQuestion] =
      selectedAnswer

    setAnswers(updatedAnswers)
    setSubmitted(true)
  }

  // =========================================================
  // NEXT QUESTION
  // =========================================================

  const handleNext = () => {
    if (!quiz) return

    if (
      currentQuestion ===
      quiz.questions.length - 1
    ) {
      setFinished(true)
      return
    }

    setCurrentQuestion(
      (previous) => previous + 1
    )

    setSelectedAnswer(null)
    setSubmitted(false)
  }

  // =========================================================
  // RESTART QUIZ
  // =========================================================

  const handleRestart = () => {
    if (!quiz) return

    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setSubmitted(false)
    setFinished(false)

    setAnswers(
      new Array(quiz.questions.length).fill(null)
    )
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4">

        <Loader2 className="size-9 animate-spin text-primary" />

        <div className="text-center">

          <p className="font-medium">
            {retrying
              ? 'The quiz service is busy...'
              : 'Creating your practice exam...'}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {retrying
              ? 'Waiting a moment and trying again automatically.'
              : 'Finding the most important concepts from your PDF.'}
          </p>

        </div>

      </div>
    )
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-destructive/20 bg-destructive/10 p-7">

        <h3 className="font-semibold text-destructive">
          Quiz generation failed
        </h3>

        <p className="mt-2 text-sm text-destructive">
          {error}
        </p>

        <button
          type="button"
          onClick={generateQuiz}
          className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>

      </div>
    )
  }

  // =========================================================
  // NO QUIZ
  // =========================================================

  if (!quiz) {
    return (
      <div className="rounded-3xl bg-card p-7 text-center text-muted-foreground">
        Upload a PDF to generate your practice quiz.
      </div>
    )
  }

  // =========================================================
  // SCORE
  // =========================================================

  if (finished) {
    const total = quiz.questions.length

    const finalScore =
      quiz.questions.reduce(
        (score, question, index) =>
          score +
          (answers[index] ===
          question.correctAnswer
            ? 1
            : 0),
        0
      )

    const percentage = Math.round(
      (finalScore / total) * 100
    )

    const incorrect =
      total - finalScore

    let message = ''

    if (percentage >= 90) {
      message =
        'Excellent! You have a strong understanding of this material.'
    } else if (percentage >= 75) {
      message =
        'Great work! You understand most of the important concepts.'
    } else if (percentage >= 60) {
      message =
        'Good effort. Review the concepts you missed before your exam.'
    } else {
      message =
        'Keep going. Review the material carefully and try the quiz again.'
    }

    return (
      <div className="flex flex-col gap-8">

        <PageTitle
          eyebrow=""
          title="Your exam result"
        />

        <div className="mx-auto w-full max-w-2xl rounded-3xl bg-card p-8 text-center shadow-sm">

          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="size-8" />
          </div>

          <p className="mt-6 text-sm font-medium text-muted-foreground">
            Final score
          </p>

          <h2 className="mt-2 text-5xl font-bold tracking-tight">
            {finalScore}

            <span className="text-2xl text-muted-foreground">
              {' '} / {total}
            </span>
          </h2>

          <p className="mt-2 text-xl font-semibold text-primary">
            {percentage}%
          </p>

          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-muted-foreground">
            {message}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">

            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">
                Correct
              </p>

              <p className="mt-1 text-xl font-semibold">
                {finalScore}
              </p>
            </div>

            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">
                Incorrect
              </p>

              <p className="mt-1 text-xl font-semibold">
                {incorrect}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={handleRestart}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <RotateCcw className="size-4" />
            Review quiz again
          </button>

        </div>

      </div>
    )
  }

  // =========================================================
  // CURRENT QUESTION
  // =========================================================

  const question =
    quiz.questions[currentQuestion]

  const totalQuestions =
    quiz.questions.length

  const isCorrect =
    selectedAnswer ===
    question.correctAnswer

  return (
    <div className="flex flex-col gap-8">

      <PageTitle
        eyebrow=""
        title="Check your understanding"
      />

      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-card p-7 shadow-sm">

        {/* QUESTION HEADER */}

        <div className="flex items-center justify-between text-sm text-muted-foreground">

          <span className="font-medium">
            Question{' '}
            {String(
              currentQuestion + 1
            ).padStart(2, '0')}

            <span className="text-muted-foreground">
              {' '}of {totalQuestions}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <Gauge className="size-4" />
            Practice
          </span>

        </div>

        {/* PROGRESS */}

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">

          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${
                ((currentQuestion + 1) /
                  totalQuestions) *
                100
              }%`,
            }}
          />

        </div>

        {/* QUESTION */}

        <h2 className="mt-8 text-2xl font-semibold leading-snug">
          {question.question}
        </h2>

        {/* OPTIONS */}

        <div className="mt-7 flex flex-col gap-3">

          {question.options.map(
            (option, index) => {

              const selected =
                selectedAnswer === index

              const correct =
                index ===
                question.correctAnswer

              let optionStyle =
                'border-border hover:bg-muted'

              if (
                !submitted &&
                selected
              ) {
                optionStyle =
                  'border-primary bg-primary/5'
              }

              if (
                submitted &&
                correct
              ) {
                optionStyle =
                  'border-green-500 bg-green-500/10'
              }

              if (
                submitted &&
                selected &&
                !correct
              ) {
                optionStyle =
                  'border-destructive bg-destructive/10'
              }

              return (
                <button
                  key={option}
                  type="button"
                  disabled={submitted}
                  onClick={() =>
                    setSelectedAnswer(
                      index
                    )
                  }
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left text-sm transition ${optionStyle}`}
                >

                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                    {String.fromCharCode(
                      65 + index
                    )}
                  </span>

                  <span className="flex-1">
                    {option}
                  </span>

                  {submitted &&
                    correct && (
                      <Check className="size-4 text-green-600" />
                    )}

                  {submitted &&
                    selected &&
                    !correct && (
                      <X className="size-4 text-destructive" />
                    )}

                </button>
              )
            }
          )}

        </div>

        {/* EXPLANATION */}

        {submitted && (
          <div
            className={`mt-5 rounded-xl p-4 text-sm leading-6 ${
              isCorrect
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}
          >

            <p className="font-semibold">
              {isCorrect
                ? 'Correct!'
                : 'Not quite.'}
            </p>

            <p className="mt-1">
              {question.explanation}
            </p>

          </div>
        )}

        {/* BUTTON */}

        {!submitted ? (
          <button
            type="button"
            disabled={
              selectedAnswer === null
            }
            onClick={handleSubmit}
            className="mt-7 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="mt-7 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {currentQuestion ===
            totalQuestions - 1
              ? 'View my score'
              : 'Next question'}
          </button>
        )}

      </div>
    </div>
  )
}