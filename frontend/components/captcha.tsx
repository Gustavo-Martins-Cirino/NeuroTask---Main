"use client"

import { useRef, useState } from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { captchaLigado } from "@/lib/captcha"
import type { Idioma } from "@/lib/i18n"

// Sem a Site Key na Vercel, nada aparece e o login segue como antes — é o que
// permite publicar isto ANTES de ligar o CAPTCHA no Supabase (ver lib/captcha.ts).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function useCaptcha() {
  const ref = useRef<TurnstileInstance | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const ligado = captchaLigado(SITE_KEY)
  return {
    ref,
    token,
    setToken,
    ligado,
    /** O botão espera o token — sem CAPTCHA configurado, nunca espera. */
    pronto: !ligado || token !== null,
    /** O token vale UMA vez: depois de cada envio, o widget gera outro. */
    renovar: () => {
      setToken(null)
      ref.current?.reset()
    },
  }
}

export function Captcha({ captcha, idioma }: { captcha: ReturnType<typeof useCaptcha>; idioma: Idioma }) {
  if (!captcha.ligado || !SITE_KEY) return null
  return (
    <Turnstile
      ref={captcha.ref}
      siteKey={SITE_KEY}
      onSuccess={captcha.setToken}
      onExpire={() => captcha.setToken(null)}
      onError={() => captcha.setToken(null)}
      options={{ theme: "auto", size: "flexible", language: idioma === "en" ? "en" : "pt-br" }}
    />
  )
}
