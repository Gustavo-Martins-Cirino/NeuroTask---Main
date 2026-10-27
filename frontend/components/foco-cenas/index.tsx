"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import { cenaPorId, type IdCena } from "@/lib/foco-cenas"
import type { PropsDaCena } from "./tipos"

// Cada cena paga é um pedaço de código à parte, baixado só por quem a escolhe:
// quem fica nos ambientes de graça não paga o peso de nenhuma.
const CENAS: Record<IdCena, ComponentType<PropsDaCena>> = {
  correnteza: dynamic(() => import("./correnteza").then((m) => m.Correnteza), { ssr: false }),
  formulas: dynamic(() => import("./formulas").then((m) => m.Formulas), { ssr: false }),
  folego: dynamic(() => import("./folego").then((m) => m.Folego), { ssr: false }),
  revoada: dynamic(() => import("./revoada").then((m) => m.Revoada), { ssr: false }),
  "buraco-negro": dynamic(() => import("./buraco-negro").then((m) => m.BuracoNegro), { ssr: false }),
  ferrofluido: dynamic(() => import("./ferrofluido").then((m) => m.Ferrofluido), { ssr: false }),
  constelacao: dynamic(() => import("./constelacao").then((m) => m.Constelacao), { ssr: false }),
  sinapses: dynamic(() => import("./sinapses").then((m) => m.Sinapses), { ssr: false }),
}

/** O fundo da cena, atrás do timer. A cor sólida fica por baixo enquanto carrega — e se o WebGL falhar. */
export function CenaDoFoco({ id, ...props }: PropsDaCena & { id: IdCena }) {
  const Cena = CENAS[id]
  const cena = cenaPorId(id)
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" style={{ background: cena?.fundo }}>
      <Cena {...props} />
    </div>
  )
}
