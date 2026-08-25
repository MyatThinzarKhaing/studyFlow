'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Brain, CircleHelp, FileText, Flame, LayoutDashboard, Sparkles, X } from 'lucide-react'

const modes = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/summary', label: 'Summary', icon: FileText },
  { href: '/flashcards', label: 'Flashcards', icon: Brain },
  { href: '/quiz', label: 'Practice quiz', icon: CircleHelp },
  { href: '/tutor', label: 'AI tutor', icon: Bot },
]

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const pathname = usePathname()
  return <aside className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-card p-5 transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex items-center justify-between"><Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span><span className="font-semibold tracking-tight">StudyFlow</span></Link><button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
    <nav className="mt-12 flex flex-col gap-1" aria-label="Study navigation">{modes.map(({ href, label, icon: Icon }) => { const active = href === '/' ? pathname === '/' : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}</Link> })}</nav>
    <div className="mt-auto flex flex-col gap-4"><div className="rounded-2xl bg-muted p-4"><div className="flex items-center justify-between text-xs font-medium"><span className="flex items-center gap-1.5"><Flame className="size-3.5 text-accent-foreground" /> Study streak</span><span>4 days</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full w-3/5 rounded-full bg-accent-foreground" /></div><p className="mt-2 text-xs text-muted-foreground">Keep it going. You&apos;re doing great.</p></div><div className="flex items-center gap-3 border-t border-border pt-4"><div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">AM</div><div><p className="text-sm font-medium">Alex Morgan</p><p className="text-xs text-muted-foreground">12 day goal</p></div></div></div>
  </aside>
}
