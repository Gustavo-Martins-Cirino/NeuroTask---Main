"use client"

import { Header } from "@/components/header"
import { FriendsSection } from "@/components/friends-section"
import { Users, CalendarClock } from "lucide-react"
import { useDicionario } from "@/hooks/use-idioma"
import { enfatizar } from "@/lib/enfase"

export default function FriendsPage() {
  const traducao = useDicionario()
  return (
    <div className="flex min-h-screen flex-col">
      <Header title={traducao.telas.amigos} icon={<Users className="h-4 w-4" />} />

      <div className="flex-1 px-4 py-6 md:px-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <FriendsSection />

          {/* Como funciona */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card p-4">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
              {enfatizar(traducao.amigos.dica)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
