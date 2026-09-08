"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Lock } from "lucide-react"
import { agendaDosProximosDias, type BlocoBruto, type DiaDaAgenda } from "@/lib/faixas-ocupadas"

// A metade visível da agenda compartilhada (/agenda/<token>).
//
// Cliente, e o cálculo só roda DEPOIS de montar: `agendaDosProximosDias` usa a
// hora local de quem executa, e no servidor isso seria o fuso do Vercel (UTC).
// Renderizar lá e hidratar aqui mostraria dois horários diferentes para o mesmo
// bloco — e um horário errado numa página de marcar reunião é pior que uma
// página que demora um quadro a mais para aparecer.
//
// Os blocos chegam sem título de propósito (ver a página que monta isto): daqui
// não haveria como vazar, mesmo que alguém mudasse este arquivo.

const fmtHora = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d)

const fmtDia = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { weekday: "long", day: "2-digit", month: "2-digit" }).format(d)

function ehHoje(d: Date): boolean {
  const hoje = new Date()
  return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
}

export function AgendaPublicaView({
  nome,
  dias,
  blocos,
}: {
  nome: string | null
  dias: number
  blocos: BlocoBruto[]
}) {
  const [agenda, setAgenda] = useState<DiaDaAgenda[] | null>(null)
  const [fuso, setFuso] = useState("")

  useEffect(() => {
    setAgenda(agendaDosProximosDias(blocos, new Date(), dias))
    try {
      setFuso(new Intl.DateTimeFormat().resolvedOptions().timeZone ?? "")
    } catch {
      /* navegador sem Intl completo: segue sem o rótulo */
    }
  }, [blocos, dias])

  const dono = nome ?? "Esta pessoa"

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Horários ocupados {nome ? `de ${nome}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Os próximos {dias} {dias === 1 ? "dia" : "dias"}. O que não está marcado aqui está livre.
            {fuso && <> Horários no fuso <span className="font-medium text-foreground">{fuso}</span>.</>}
          </p>
        </header>

        {agenda === null ? (
          <p className="rounded-2xl border border-border/40 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
            Carregando a agenda…
          </p>
        ) : (
          <ul className="space-y-2.5">
            {agenda.map(({ dia, faixas }) => (
              <li
                key={dia.toISOString()}
                className="rounded-2xl border border-border/40 bg-card/50 p-4 backdrop-blur-sm"
              >
                <p className="text-sm font-semibold capitalize text-foreground">
                  {fmtDia(dia)}
                  {ehHoje(dia) && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      hoje
                    </span>
                  )}
                </p>
                {faixas.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">Livre o dia todo</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {faixas.map((f) => (
                      <li
                        key={f.start.toISOString()}
                        className="rounded-lg bg-red-500/10 px-2.5 py-1 text-sm font-medium tabular-nums text-red-600 dark:text-red-400"
                      >
                        {fmtHora(f.start)} – {fmtHora(f.end)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground/70">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {dono} compartilhou só os horários. O que ocupa cada faixa — título, local ou com quem —
            nunca sai do app.
          </span>
        </p>
      </div>
    </div>
  )
}
