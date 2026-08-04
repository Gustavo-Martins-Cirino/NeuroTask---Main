"use client"

import { useEffect, useState } from "react"
import { parseTimeFormat, TIME_FORMAT_DEFAULT, type TimeFormat } from "@/lib/time-format"

const STORAGE_KEY = "neurotask:time-format"
const CHANGED_EVENT = "neurotask:time-format-changed"

export function setTimeFormat(format: TimeFormat) {
  localStorage.setItem(STORAGE_KEY, format)
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

// Começa no padrão e corrige depois de montar: ler localStorage durante o
// render quebraria a hidratação (o servidor não tem como saber a preferência).
export function useTimeFormat(): TimeFormat {
  const [format, setFormat] = useState<TimeFormat>(TIME_FORMAT_DEFAULT)

  useEffect(() => {
    const read = () => setFormat(parseTimeFormat(localStorage.getItem(STORAGE_KEY)))
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
