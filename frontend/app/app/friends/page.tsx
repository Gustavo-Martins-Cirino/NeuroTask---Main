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

          {/* Próximo passo do social (registrado no roadmap) */}
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border/50 p-4">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Em breve:</span> ver os horários ocupados
              do amigo (se ele permitir) e convidar para um compromisso direto por aqui — a reunião
              entra no calendário dos dois.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
