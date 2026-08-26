'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Sparkles,
  X,
} from 'lucide-react'

const modes = [
  {
    href: '/',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    href: '/summary',
    label: 'Summary',
    icon: FileText,
  },
  {
    href: '/flashcards',
    label: 'Flashcards',
    icon: Brain,
  },
  {
    href: '/quiz',
    label: 'Practice quiz',
    icon: CircleHelp,
  },
  {
    href: '/tutor',
    label: 'AI tutor',
    icon: Bot,
  },
]

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export function Sidebar({
  open,
  setOpen,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30
        flex flex-col
        border-r border-border
        bg-card
        transition-all duration-300 ease-in-out

        ${collapsed ? 'w-20 p-3' : 'w-64 p-5'}

        ${open ? 'translate-x-0' : '-translate-x-full'}

        md:static
        md:translate-x-0
      `}
    >
      {/* =====================================================
          LOGO
      ===================================================== */}

      <div
        className={`flex items-center ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>

          {!collapsed && (
            <span className="font-semibold tracking-tight">
              StudyFlow
            </span>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav
        className={`mt-12 flex flex-col gap-2 ${
          collapsed ? 'items-center' : ''
        }`}
        aria-label="Study navigation"
      >
        {modes.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              title={collapsed ? label : undefined}
              className={`
                flex items-center
                rounded-xl
                text-sm
                transition-all duration-200

                ${collapsed
                  ? 'size-11 justify-center'
                  : 'w-full gap-3 px-3 py-2.5'
                }

                ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Icon className="size-4 shrink-0" />

              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* =====================================================
          DESKTOP COLLAPSE BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={
          collapsed
            ? 'Expand sidebar'
            : 'Collapse sidebar'
        }
        title={
          collapsed
            ? 'Expand sidebar'
            : 'Collapse sidebar'
        }
        className="
          absolute
          -right-3
          top-20
          hidden
          size-6
          items-center
          justify-center
          rounded-full
          border
          border-border
          bg-card
          text-muted-foreground
          shadow-sm
          transition-all
          hover:bg-muted
          hover:text-foreground
          md:flex
        "
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronLeft className="size-3.5" />
        )}
      </button>
    </aside>
  )
}