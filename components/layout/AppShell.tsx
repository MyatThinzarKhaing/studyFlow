'use client'

import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  // Desktop sidebar state
  const [collapsed, setCollapsed] = useState(false)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">

        {/* =====================================================
            SIDEBAR
        ===================================================== */}

        <Sidebar
          open={open}
          setOpen={setOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* =================================================
              MOBILE HEADER
          ================================================= */}

          <div
            className="
              flex
              items-center
              gap-3
              border-b
              border-border
              bg-background/80
              px-5
              py-4
              backdrop-blur
              md:hidden
            "
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="
                rounded-lg
                p-1.5
                transition
                hover:bg-muted
              "
            >
              <Menu className="size-5" />
            </button>

            <span className="font-semibold">
              StudyFlow
            </span>
          </div>

          {/* =================================================
              PAGE CONTENT
          ================================================= */}

          <div
            className="
              mx-auto
              w-full
              max-w-6xl
              flex-1
              px-5
              py-8
              md:px-10
              md:py-12
            "
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

export function PageTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: string
}) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-sm font-medium text-muted-foreground">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>

      {action && (
        <button
          type="button"
          className="
            hidden
            rounded-lg
            border
            border-border
            px-3
            py-2
            text-sm
            font-medium
            sm:block
          "
        >
          {action}
        </button>
      )}
    </header>
  )
}