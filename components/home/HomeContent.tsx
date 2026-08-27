'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'

import {
  Brain,
  ChevronRight,
  FileText,
  MessageCircle,
  Target,
  Upload,
} from 'lucide-react'

import { uploadPDF } from '@/lib/api'

const tools = [
  {
    href: '/summary',
    icon: FileText,
    title: 'Smart summary',
    text: 'Turn dense chapters into clear, structured notes.',
    color: 'bg-accent/30',
  },
  {
    href: '/flashcards',
    icon: Brain,
    title: 'Flashcards',
    text: 'Build active recall with cards made from your PDF.',
    color: 'bg-primary/10',
  },
  {
    href: '/quiz',
    icon: Target,
    title: 'Practice quiz',
    text: 'Test yourself with adaptive multiple-choice questions.',
    color: 'bg-secondary',
  },
  {
    href: '/tutor',
    icon: MessageCircle,
    title: 'AI tutor',
    text: 'Ask questions and get unstuck, step by step.',
    color: 'bg-muted',
  },
]

export function HomeContent() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [uploaded, setUploaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // =========================================================
  // SYNCHRONIZE SAVED FILE
  // =========================================================

  const syncSavedFile = useCallback(() => {
    try {
      const savedName =
        sessionStorage.getItem('studyflow_pdf_name') ||
        localStorage.getItem('active_pdf_filename')

      if (savedName) {
        setFileName(savedName)
        setUploaded(true)
      } else {
        setUploaded(false)
        setFileName('')
      }
    } catch (e) {
      console.error('Failed to read from storage:', e)
    }
  }, [])

  useEffect(() => {
    syncSavedFile()

    window.addEventListener('focus', syncSavedFile)

    return () => {
      window.removeEventListener('focus', syncSavedFile)
    }
  }, [syncSavedFile])

  // =========================================================
  // HANDLE PDF UPLOAD
  // =========================================================

  const onFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setErrorMessage('Please select a PDF file.')
      return
    }

    setBusy(true)
    setErrorMessage(null)

    try {
      // -----------------------------------------------------
      // 0. CREATE AND SAVE OBJECT URL FOR THE NATIVE PDF VIEWER
      // -----------------------------------------------------
      const fileUrl = URL.createObjectURL(file)
      sessionStorage.setItem('studyflow_pdf_url', fileUrl)

      // -----------------------------------------------------
      // 1. EXTRACT TEXT LOCALLY
      // -----------------------------------------------------
      let extractedText = ''

      try {
        const pdfToTextModule = await import('react-pdftotext')
        const pdfToText =
          pdfToTextModule.default || pdfToTextModule
        extractedText = await pdfToText(file)
      } catch (pdfErr) {
        console.error(
          '[PDF] react-pdftotext warning:',
          pdfErr
        )
      }

      if (
        extractedText &&
        extractedText.trim().length >= 10
      ) {
        sessionStorage.setItem(
          'studyflow_pdf_text',
          extractedText
        )
      }

      // -----------------------------------------------------
      // 2. SEND FILE TO FASTAPI BACKEND
      // -----------------------------------------------------
      await uploadPDF(file)

      // -----------------------------------------------------
      // 3. SAVE FILE NAME
      // -----------------------------------------------------
      localStorage.setItem(
        'active_pdf_filename',
        file.name
      )

      sessionStorage.setItem(
        'studyflow_pdf_name',
        file.name
      )

      setFileName(file.name)
      setUploaded(true)

    } catch (error: unknown) {
      console.error(
        '[PDF] Upload/Extraction Error:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to process the PDF.'
      )

      sessionStorage.removeItem('studyflow_pdf_text')
      sessionStorage.removeItem('studyflow_pdf_name')
      sessionStorage.removeItem('studyflow_pdf_url') // Clean up url on error too
      localStorage.removeItem('active_pdf_filename')

      setUploaded(false)
      setFileName('')

    } finally {
      setBusy(false)

      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex flex-col gap-8">

      {/* =====================================================
          WELCOME HEADER
      ===================================================== */}

      <header className="flex flex-col items-center justify-center py-4 text-center">

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          What are you learning today?
        </h1>

        <p className="mt-3 max-w-xl text-muted-foreground">
          Upload your study material and turn it into
          summaries, flashcards, quizzes, and more.
        </p>

      </header>

      {/* =====================================================
          UPLOAD + CURRENT DOCUMENT
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">

        {/* ===================================================
            PDF UPLOAD BOX
        =================================================== */}

        <div
          onClick={() =>
            !busy && inputRef.current?.click()
          }
          className="group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card px-6 text-center transition hover:border-primary/50 hover:bg-muted"
        >

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={onFileChange}
          />

          {/* Upload Icon */}

          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="size-6" />
          </span>

          {/* Upload Title */}

          <h2 className="mt-5 text-lg font-semibold">
            {busy
              ? 'Processing PDF...'
              : uploaded
                ? fileName
                : 'Drop your PDF here'}
          </h2>

          {/* Upload Description */}

          <p className="mt-1 text-sm text-muted-foreground">
            {uploaded
              ? 'PDF uploaded successfully'
              : 'or click to browse from your device'}
          </p>

          {/* Error */}

          {errorMessage && (
            <p className="mt-2 text-xs font-medium text-destructive">
              {errorMessage}
            </p>
          )}

          {/* Upload Button */}

          <button
            type="button"
            className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {busy
              ? 'Uploading...'
              : uploaded
                ? 'Choose another file'
                : 'Upload PDF'}
          </button>

        </div>

        {/* ===================================================
            CURRENT DOCUMENT CARD
        =================================================== */}

        <div className="flex flex-col justify-between rounded-3xl bg-primary p-7 text-primary-foreground">

          <div>

            {/* Label */}

            <span className="inline-flex rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
              Current document
            </span>

            {/* File Name */}

            <h2
              className="mt-5 max-w-[280px] truncate text-2xl font-semibold tracking-tight"
              title={fileName}
            >
              {uploaded
                ? fileName.replace(/\.pdf$/i, '')
                : 'Introduction to Psychology'}
            </h2>

            {/* Status Text */}

            <p className="mt-2 text-sm text-primary-foreground/70">
              {uploaded
                ? 'Active Document'
                : 'Ready for study tools'}
            </p>

          </div>

          {/* Document Status */}

          <div className="mt-8">

            <div className="flex justify-between text-xs text-primary-foreground/70">

              <span>
                Status
              </span>

              <span>
                {uploaded
                  ? 'Uploaded'
                  : 'Ready'}
              </span>

            </div>

            <div className="mt-2 h-2 rounded-full bg-primary-foreground/15">

              <div className="h-full w-full rounded-full bg-accent" />

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          STUDY TOOLS
      ===================================================== */}

      <section>

        <div className="mb-4 flex items-center justify-between">

          <h2 className="text-lg font-semibold">
            Study tools
          </h2>

          <span className="text-sm text-muted-foreground">
            Choose a mode
          </span>

        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          {tools.map(
            ({
              href,
              icon: Icon,
              title,
              text,
              color,
            }) => (

              <Link
                key={href}
                href={href}
                className={`flex flex-col items-start rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${color}`}
              >

                <Icon className="size-5" />

                <h3 className="mt-7 font-semibold">
                  {title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {text}
                </p>

                <ChevronRight className="mt-4 size-4 text-muted-foreground" />

              </Link>

            )
          )}

        </div>

      </section>

    </div>
  )
}