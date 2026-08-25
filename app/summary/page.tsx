'use client'

import { useEffect, useState } from 'react'
import { SummaryContent } from '@/components/summary/SummaryContent'
import { AppShell } from '@/components/layout/AppShell'

export default function SummaryPage() {
  const [data, setData] = useState<{ pdfText: string; fileName: string } | null>(null)

  useEffect(() => {
    // Force read from sessionStorage as soon as component mounts in the browser
    const text = sessionStorage.getItem('studyflow_pdf_text') || ''
    const name = sessionStorage.getItem('studyflow_pdf_name') || ''

    console.log('[SummaryPage] Hydrated sessionStorage:', {
      hasText: text.length > 0,
      textLength: text.length,
      fileName: name,
    })

    setData({ pdfText: text, fileName: name })
  }, [])

  // Prevent flash or blank state until client hydration finishes
  if (!data) {
    return (
      <AppShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground">Loading document summary...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <SummaryContent
        pdfText={data.pdfText}
        fileName={data.fileName}
        chapterTitle={data.fileName.replace(/\.pdf$/i, '')}
      />
    </AppShell>
  )
}
