import { cn } from "@/lib/utils"
import type { EstadoOnda } from "@/lib/onda-sonora"

// A luz que respira no rodapé da conversa ao vivo (referência: a mancha que o
// Claude acende embaixo enquanto fala). Azul quando é você, verde quando é ela;
// apagada quando ninguém fala. A regra de quem é a vez está em lib/onda-sonora.
//
// A luz é procedural, não vem do áudio de verdade. Ler a amplitude daria um
// desenho mais fiel, mas exigiria passar a voz da Neuro por um AudioContext — e
// pôr um nó de análise no meio da reprodução é justamente onde mobile costuma
// emudecer o áudio. Não vale arriscar a voz para ganhar fidelidade num enfeite.
//
// Três manchas com tempos que não se dividem: elas se cruzam em lugares
// diferentes a cada volta, então a luz muda de forma em vez de pulsar igual.
// Tudo em CSS (ver .onda-sonora em globals.css) — zero JS por quadro, e parada
// de vez quando a conversa está em silêncio.

export function OndaSonora({ estado, className }: { estado: EstadoOnda; className?: string }) {
  const ativa = estado !== "parado"
  return (
    <div
      aria-hidden
      data-ativa={ativa}
      className={cn("onda-sonora", className)}
      style={{
        opacity: ativa ? 1 : 0,
        ["--onda-cor" as string]: estado === "falando" ? "var(--onda-verde)" : "var(--onda-azul)",
      }}
    >
      <span style={{ ["--tam" as string]: "min(70vw, 620px)", ["--x" as string]: "-7%", ["--tempo" as string]: "3.1s" }} />
      <span style={{ ["--tam" as string]: "min(52vw, 460px)", ["--x" as string]: "9%", ["--tempo" as string]: "2.3s" }} />
      <span style={{ ["--tam" as string]: "min(38vw, 320px)", ["--x" as string]: "-4%", ["--tempo" as string]: "1.7s" }} />
    </div>
  )
}
