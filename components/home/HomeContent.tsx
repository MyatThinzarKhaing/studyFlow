'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Brain, FileText, MessageCircle, Target, Upload, ChevronRight } from 'lucide-react'
import { uploadPDF, fetchFlashcards } from '@/lib/api'

const tools = [
  { href:'/summary', icon:FileText, title:'Smart summary', text:'Turn dense chapters into clear, structured notes.', color:'bg-accent/30' },
  { href:'/flashcards', icon:Brain, title:'Flashcards', text:'Build active recall with cards made from your PDF.', color:'bg-primary/10' },
  { href:'/quiz', icon:Target, title:'Practice quiz', text:'Test yourself with adaptive multiple-choice questions.', color:'bg-secondary' },
  { href:'/tutor', icon:MessageCircle, title:'AI tutor', text:'Ask questions and get unstuck, step by step.', color:'bg-muted' }
]

export function HomeContent(){ 
  const input = useRef<HTMLInputElement>(null); 
  const router = useRouter();
  const [uploaded, setUploaded] = useState(false); 
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false); 

  const onFile = async (file?: File) => {
    if(!file) return;
    setBusy(true);
    setFileName(file.name);
    try {
      await uploadPDF(file);
      // Fetch freshly generated flashcards and cache them for the flashcards viewer page
      const cards = await fetchFlashcards();
      localStorage.setItem('generated_flashcards', JSON.stringify(cards));
      setUploaded(true);
      // Optionally auto-redirect to flashcards view
      router.push('/flashcards');
    } catch (err) { 
      console.error(err);
      alert("Failed to generate flashcards via Groq API.");
    } finally {
      setBusy(false);
    }
  }; 

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Tuesday, August 24, 2026</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Good morning, Alex.</h1>
        <p className="mt-2 max-w-lg text-muted-foreground">Ready to make progress? Pick up where you left off or upload something new.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <button onClick={() => input.current?.click()} className="group flex min-h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card px-6 text-center transition hover:border-primary/50 hover:bg-muted">
          <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={e => onFile(e.target.files?.[0])}/>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="size-6"/>
          </span>
          <h2 className="mt-5 text-lg font-semibold">{busy ? 'Groq is generating cards…' : uploaded ? fileName : 'Drop your PDF here'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{uploaded ? 'PDF processed successfully' : 'or click to browse from your device'}</p>
          <span className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {busy ? 'Processing...' : uploaded ? 'Choose another file' : 'Upload PDF'}
          </span>
        </button>
        <div className="flex flex-col justify-between rounded-3xl bg-primary p-7 text-primary-foreground">
          <div>
            <span className="inline-flex rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">Current document</span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">{fileName || 'Introduction to Psychology'}</h2>
            <p className="mt-2 text-sm text-primary-foreground/70">AI-powered active recall session</p>
          </div>
          <div className="mt-8">
            <div className="flex justify-between text-xs text-primary-foreground/70"><span>Processing status</span><span>{uploaded ? '100%' : 'Ready'}</span></div>
            <div className="mt-2 h-2 rounded-full bg-primary-foreground/15"><div className="h-full w-full rounded-full bg-accent"/></div>
            <Link href="/flashcards" className="mt-6 flex items-center gap-2 text-sm font-semibold">View Flashcards <ArrowRight className="size-4"/></Link>
          </div>
        </div>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Study tools</h2><span className="text-sm text-muted-foreground">Choose a mode</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map(({href, icon:Icon, title, text, color}) => (
            <Link key={href} href={href} className={`flex flex-col items-start rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${color}`}>
              <Icon className="size-5"/>
              <h3 className="mt-7 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              <ChevronRight className="mt-4 size-4 text-muted-foreground"/>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}