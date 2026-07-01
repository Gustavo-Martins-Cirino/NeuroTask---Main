"use client"

import { Dock } from "@/components/dock"
import { PageTransition } from "@/components/page-transition"
import { FocusProvider } from "@/components/focus"
import { ReminderNotifier } from "@/components/reminder-notifier"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <FocusProvider>
      <ReminderNotifier />
      <div className="min-h-screen bg-background">
        <Dock />
        <main className="pl-24">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </FocusProvider>
  )
}
