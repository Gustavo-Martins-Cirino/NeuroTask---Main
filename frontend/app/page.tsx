"use client"

import Link from "next/link"
import { Sparkles, CalendarClock, Timer, Trophy, Users, Bell, ShieldCheck, ArrowRight } from "lucide-react"
import { AuthBackdrop } from "@/components/auth-backdrop"
import { SeletorRegiao } from "@/components/seletor-regiao"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { dicionario } from "@/lib/i18n"
import { enfatizar } from "@/lib/enfase"

// A landing pública. Quem chega sem conta vê isto; quem já entrou nem passa por
// aqui, porque o proxy manda para /app antes (lib/supabase/middleware.ts).
//
// Mesmo fundo das telas de entrada, de propósito: a landing e o login são a
// mesma porta, e o AuthBackdrop é CSS puro — numa primeira visita, às vezes em
// rede ruim, um canvas atrasaria justamente a página que precisa convencer.
//
// Os ícones moram AQUI e os textos no dicionário, casados por id: é a mesma
// divisão do resto do app, e evita a lista paralela que desalinha no dia em que
// alguém acrescentar um recurso no meio.
const RECURSOS = [
  { id: "tarefas", Icone: CalendarClock },
  { id: "ia", Icone: Sparkles },
  { id: "foco", Icone: Timer },
  { id: "escritorio", Icone: Trophy },
  { id: "amigos", Icone: Users },
  { id: "lembretes", Icone: Bell },
] as const

export default function Landing() {
  // Fora do AppShell: esta página cuida sozinha do `lang` do documento.
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const t = dicionario(idioma).landing

  return (
    <AuthBackdrop className="justify-start py-16">
      <div className="w-full max-w-3xl space-y-16">
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl [&_strong]:font-bold [&_strong]:text-primary">
              {enfatizar(t.heroTitulo)}
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t.heroSubtitulo}
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              {t.criarConta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border/60 px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
            >
              {t.jaTenhoConta}
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {RECURSOS.map(({ id, Icone }) => (
            <div key={id} className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-sm">
              <Icone className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold text-foreground">{t.recursos[id].titulo}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.recursos[id].texto}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-base font-semibold text-foreground">{t.privacidadeTitulo}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t.privacidadeTexto}</p>
        </section>

        <footer className="flex flex-col items-center gap-4 border-t border-border/30 pt-8">
          {/* Quem chega aqui ainda não tem região escolhida, e a landing nasce em
              português. Sem este seletor, quem lê em inglês não teria como sair
              disso antes de criar a conta. */}
          <SeletorRegiao />
          <p className="text-xs text-muted-foreground">{t.rodape}</p>
        </footer>
      </div>
    </AuthBackdrop>
  )
}
