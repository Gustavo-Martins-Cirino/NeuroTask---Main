"use client"

import { useEffect, useState } from "react"
import { parseTimeFormat, TIME_FORMAT_DEFAULT, type TimeFormat } from "@/lib/time-format"

const STORAGE_KEY = "neurotask:time-format"
const CHANGED_EVENT = "neurotask:time-format-changed"

// Todo acesso ao localStorage vai protegido: em Safari privado, ou com cookies
// bloqueados, a chamada LANÇA em vez de devolver null. Isso já valia antes,
// mas ficou mais caro depois que o dock passou a ler daqui (via useDicionario)
// em toda página: uma exceção deixou de derrubar o formato da hora e passou a
// derrubar a casca do app inteira.
export function setTimeFormat(format: TimeFormat) {
  try {
    localStorage.setItem(STORAGE_KEY, format)
  } catch {
    /* sem armazenamento: a escolha vale só nesta aba, e é melhor que uma tela branca */
  }
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

function lerDoArmazenamento(): TimeFormat {
  try {
    return parseTimeFormat(localStorage.getItem(STORAGE_KEY))
  } catch {
    return TIME_FORMAT_DEFAULT
  }
}

// Começa no padrão e corrige depois de montar: ler localStorage durante o
// render quebraria a hidratação (o servidor não tem como saber a preferência).
export function useTimeFormat(): TimeFormat {
  const [format, setFormat] = useState<TimeFormat>(TIME_FORMAT_DEFAULT)

  useEffect(() => {
    const read = () => setFormat(lerDoArmazenamento())
    read()
    window.addEventListener(CHANGED_EVENT, read)
    window.addEventListener("storage", read) // outra aba mudou
    return () => {
      window.removeEventListener(CHANGED_EVENT, read)
      window.removeEventListener("storage", read)
    }
  }, [])

  return format
}
