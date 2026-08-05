"use client"

import { useEffect, useState } from "react"
import { XP_UPDATED_EVENT, type XpUpdateDetail } from "@/lib/gamification"
import {
  addPending, parsePending, takePending, CELEBRATION_MS,
} from "@/lib/office-celebration"

// Liga "trabalho real concluído" à cena 3D do Escritório.
//
// O gatilho é XP > 0 (o anti-farm de lib/gamification já barrou tarefa recém-
// criada, e o teto diário mora no servidor). Como a conclusão quase sempre
// acontece FORA do Escritório, a comemoração fica pendente no dispositivo e
// toca quando a pessoa abre a sala — desde que ainda esteja fresca.

const STORAGE_KEY = "neurotask:office-celebration"

/** Chamado por awardXp quando o XP concedido foi maior que zero. */
export function queueOfficeCelebration() {
  if (typeof window === "undefined") return
  try {
    const prev = parsePending(localStorage.getItem(STORAGE_KEY))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addPending(prev, Date.now())))
  } catch {
    // Modo privado/quota cheia: sem festa guardada, o app segue igual.
  }
}

function consume(): number {
  try {
    const n = takePending(parsePending(localStorage.getItem(STORAGE_KEY)), Date.now())
    localStorage.removeItem(STORAGE_KEY)
    return n
  } catch {
    return 0
  }
}

/**
 * Devolve um nonce que muda a cada comemoração a tocar. A cena reinicia a
 * animação quando ele muda; zero significa sala parada.
 */
export function useOfficeCelebration(enabled = true): number {
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let restantes = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const tocar = (n: number) => {
      if (n <= 0) return
      restantes = Math.max(restantes, n)
      if (timer) return // já tem festa rolando; a próxima entra na fila
      const proxima = () => {
        restantes--
        setNonce((v) => v + 1)
        timer = restantes > 0 ? setTimeout(proxima, CELEBRATION_MS) : undefined
      }
      proxima()
    }

    // Concluiu em outra tela e veio ver a sala.
    tocar(consume())

    // Concluiu com o Escritório aberto (Modo Foco, lembrete): festa na hora.
    const onXp = (e: Event) => {
      const amount = (e as CustomEvent<XpUpdateDetail>).detail?.amount ?? 0
      if (amount <= 0) return
      consume() // já vamos tocar aqui: não deixa pendente para a próxima visita
      tocar(1)
    }
    window.addEventListener(XP_UPDATED_EVENT, onXp)
    return () => {
      window.removeEventListener(XP_UPDATED_EVENT, onXp)
      if (timer) clearTimeout(timer)
    }
  }, [enabled])

  return nonce
}
