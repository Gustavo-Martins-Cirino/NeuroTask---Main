"use client"

import { Header } from "@/components/header"
import { FriendsSection } from "@/components/friends-section"
import { Users, CalendarClock } from "lucide-react"

export default function FriendsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Amigos" icon={<Users className="h-4 w-4" />} />

      <div className="flex-1 px-4 py-6 md:px-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <FriendsSection />

          {/* Como funciona */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card p-4">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Dica:</span> nos amigos, use{" "}
              <span className="font-medium text-foreground">📅 Agenda</span> para ver os horários
              ocupados de hoje (se a pessoa ativou o chip &quot;Agenda&quot;) e{" "}
              <span className="font-medium text-foreground">➕ Convidar</span> para propor um
              compromisso — quando aceito, ele entra no calendário de vocês dois automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
