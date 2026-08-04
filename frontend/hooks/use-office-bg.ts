"use client"

import { useEffect, useState } from "react"
import { parseOfficeBg, OFFICE_BG_DEFAULT, type OfficeBg } from "@/lib/office-bg"

const STORAGE_KEY = "neurotask:office-bg"
const CHANGED_EVENT = "neurotask:office-bg-changed"

export function setOfficeBg(bg: OfficeBg) {
  localStorage.setItem(STORAGE_KEY, bg)
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

// Começa no padrão e corrige depois de montar: ler localStorage no render
// quebraria a hidratação (o servidor não sabe a preferência do dispositivo).
export function useOfficeBg(): OfficeBg {
  const [bg, setBg] = useState<OfficeBg>(OFFICE_BG_DEFAULT)

  useEffect(() => {
    const read = () => setBg(parseOfficeBg(localStorage.getItem(STORAGE_KEY)))
    read()
    window.addEventListener(CHANGED_EVENT, read)
    window.addEventListener("storage", read) // outra aba mudou
    return () => {
      window.removeEventListener(CHANGED_EVENT, read)
      window.removeEventListener("storage", read)
    }
  }, [])

  return bg
}
