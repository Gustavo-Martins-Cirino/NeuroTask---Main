"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface ChangePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new?: { id?: string } & Record<string, unknown>
  old?: { id?: string } & Record<string, unknown>
}

/**
 * Inscreve-se nas mudanças (insert/update/delete) de uma tabela do Supabase
 * e chama `onChange` a cada evento. Útil para refletir em tempo real as ações
 * feitas pela Neuro IA ou em outra aba/dispositivo.
 */
export function useRealtime(table: string, onChange: (payload: ChangePayload) => void) {
  const cb = useRef(onChange)
  cb.current = onChange
  // Nome de canal único por instância (evita colisão quando duas partes do app
  // assinam a mesma tabela — ex.: página de Tarefas + FocusProvider)
  const channelId = useRef(`rt-${table}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(channelId.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => cb.current(payload as unknown as ChangePayload)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])
}
