"use client"

import { Dock } from "@/components/dock"
import { PageTransition } from "@/components/page-transition"
import { FocusProvider } from "@/components/focus"
import { ReminderNotifier } from "@/components/reminder-notifier"
import { SmoothScroll } from "@/components/smooth-scroll"
import { CoinFlight } from "@/components/coin-flight"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <FocusProvider>
      <ReminderNotifier />
      <CoinFlight />
      <SmoothScroll>
        <div className="min-h-screen bg-background">
          <Dock />
          <main className="pb-20 md:pb-0 md:pl-24">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </SmoothScroll>
    </FocusProvider>
  )
}
