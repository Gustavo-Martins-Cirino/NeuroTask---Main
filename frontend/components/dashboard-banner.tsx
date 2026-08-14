"use client"

import { paletaDoNivel, duracaoDaFaixa } from "@/lib/dashboard-banner"

// Faixa do topo do Dashboard: mesh gradient em CSS (três blobs radiais com
// blur) que anda bem devagar. A paleta vem do nível — subir de nível se VÊ.
//
// A animação é pura CSS e o próprio @media prefers-reduced-motion a desliga:
// sem JS ouvindo mudança de preferência para uma faixa decorativa.

export function DashboardBanner({
  nivel,
  children,
}: {
  nivel: number
  children: React.ReactNode
}) {
  const { cores, nome } = paletaDoNivel(nivel)
  const dur = duracaoDaFaixa(nivel)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40">
      <div aria-hidden className="absolute inset-0" style={{ background: cores[0] }}>
        {/* Um blob por cor, cada um com seu ritmo: é o descompasso entre eles
            que faz a mistura parecer viva em vez de um loop óbvio. */}
        <span className="nt-blob" style={{ background: cores[1], animationDuration: `${dur}s` }} />
        <span className="nt-blob nt-blob-2" style={{ background: cores[2], animationDuration: `${dur * 1.35}s` }} />
        <span className="nt-blob nt-blob-3" style={{ background: cores[1], animationDuration: `${dur * 0.85}s` }} />
        {/* Véu por cima: o texto tem de continuar legível em qualquer paleta. */}
        <span className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/25 to-transparent" />
      </div>

      <div className="relative px-5 py-6 md:px-7 md:py-8">
        <span className="mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          Nível {nivel} · {nome}
        </span>
        {children}
      </div>
    </div>
  )
}
