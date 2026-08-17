import { cn } from "@/lib/utils"

// O fundo pastel em malha da Neuro IA.
// Referência: components/inspirações/Captura de tela 2026-08-10 202826.png.
//
// Feito em CSS e não com o ShaderGradient, apesar de o pacote já estar
// instalado. Dois motivos, os dois específicos DESTA página: ela já carrega um
// canvas (a esfera de partículas), e o canvas do ShaderGradient é justamente o
// que não entra no ticker único — abriria um segundo requestAnimationFrame
// concorrendo com a cena 3D. Uma malha pastel não precisa de shader.
//
// Não é client component: é marcação estática, sem estado nem evento. O
// prefers-reduced-motion é tratado no CSS (ver .fundo-malha em globals.css).

const MANCHAS = [
  { cor: "var(--malha-a)", anim: "malha-deriva-a", tempo: "26s", estilo: { top: "-20%", left: "-10%", width: "75vw", height: "75vw" } },
  { cor: "var(--malha-b)", anim: "malha-deriva-b", tempo: "34s", estilo: { top: "10%", right: "-20%", width: "70vw", height: "70vw" } },
  { cor: "var(--malha-c)", anim: "malha-deriva-c", tempo: "42s", estilo: { bottom: "-25%", left: "15%", width: "65vw", height: "65vw" } },
]

export function FundoMalha({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("fundo-malha", className)}>
      {MANCHAS.map((m) => (
        <span
          key={m.anim}
          style={{
            ...m.estilo,
            ["--cor" as string]: m.cor,
            ["--anim" as string]: m.anim,
            ["--tempo" as string]: m.tempo,
          }}
        />
      ))}
    </div>
  )
}
