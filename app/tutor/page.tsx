'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
<<<<<<< Updated upstream
import { ChatWindow } from '@/components/tutor/ChatWindow'
export default function TutorPage(){return <AppShell><ChatWindow/></AppShell>}
=======
import ChatWindow from '@/components/tutor/ChatWindow'

export default function TutorPage() {
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [fileName, setFileName] = useState<string>('document.pdf')

  useEffect(() => {
    // If you store the PDF file data as a base64 string or object URL in sessionStorage:
    const storedUrl = sessionStorage.getItem('studyflow_pdf_url') || ''
    const name = sessionStorage.getItem('studyflow_pdf_name') || 'document.pdf'
    
    setPdfUrl(storedUrl)
    setFileName(name)
  }, [])

  return (
    <AppShell>
      <ChatWindow pdfUrl={pdfUrl} fileName={fileName} />
    </AppShell>
  )
}
>>>>>>> Stashed changes
