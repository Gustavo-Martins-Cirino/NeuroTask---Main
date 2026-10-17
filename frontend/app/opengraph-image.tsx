import { ImageResponse } from "next/og"
import { dicionario } from "@/lib/i18n"
import { NOME_DO_SITE, TITULO_PADRAO } from "@/lib/site"

// A prévia de quando o link é colado no WhatsApp, no Twitter e afins. Vale para
// toda página (o Next herda por segmento). O texto é o da landing em português:
// a mesma frase do site, nunca uma promessa a mais.
//
// Cores do AuthBackdrop: fundo quase preto e o azul do tema escuro
// (--primary, oklch(0.65 0.22 265) ≈ #4b82ff). A fonte é a Geist que o next/og
// já traz — só no peso normal, por isso o título não pede negrito.

export const alt = TITULO_PADRAO
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const AZUL = "#4b82ff"

export default function ImagemDePrevia() {
  const t = dicionario("pt").landing
  const [antes, destaque] = t.heroTitulo.split("§")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          backgroundColor: "#08080b",
          backgroundImage:
            "radial-gradient(circle at 0% 50%, rgba(75,130,255,0.30), transparent 45%), radial-gradient(circle at 100% 100%, rgba(75,130,255,0.22), transparent 40%)",
          color: "#f4f4f5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              backgroundColor: AZUL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#08080b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
              <path d="M20 2v4" />
              <path d="M22 4h-4" />
              <circle cx="4" cy="20" r="2" />
            </svg>
          </div>
          <div style={{ fontSize: 44, letterSpacing: -0.5 }}>{NOME_DO_SITE}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 56, fontSize: 76, lineHeight: 1.08, letterSpacing: -2 }}>
          <div>{antes.trim()}</div>
          <div style={{ color: AZUL }}>{destaque}</div>
        </div>

        <div style={{ marginTop: 36, fontSize: 30, lineHeight: 1.4, color: "#a1a1aa", maxWidth: 940 }}>{t.heroSubtitulo}</div>
      </div>
    ),
    size
  )
}
