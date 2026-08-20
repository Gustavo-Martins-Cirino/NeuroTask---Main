import { cn } from "@/lib/utils"

// Arcos de cor subindo do rodapé, centro escuro, respirando devagar.
// Referência: components/inspirações/Captura de tela 2026-08-07 214017.png.
//
// Só aparece no tema ESCURO, e isso é a decisão, não um efeito colateral: a
// referência é uma tela preta com a cor vindo de baixo, e no claro ela brigaria
// com a malha pastel que já é o fundo daquela página. No escuro a malha quase
// não se vê (croma baixo de propósito) — é justamente ali que faltava algo.
//
// CSS e não ShaderGradient, pelo mesmo motivo da malha: esta página já tem um
// canvas (a esfera da Neuro), e o do ShaderGradient é o que não entra no ticker
// único — abriria um segundo requestAnimationFrame concorrendo com ela.
//
// Não é client component: marcação estática. O prefers-reduced-motion e o
// recorte por tema vivem no CSS (.fundo-arcos em globals.css).

const ARCOS = [
  { cor: "var(--arco-a)", tempo: "19s", atraso: "0s", largura: "170vw", altura: "78vh" },
  { cor: "var(--arco-b)", tempo: "23s", atraso: "-6s", largura: "140vw", altura: "62vh" },
  { cor: "var(--arco-c)", tempo: "27s", atraso: "-13s", largura: "112vw", altura: "48vh" },
]

export function FundoArcos({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("fundo-arcos", className)}>
      {ARCOS.map((a) => (
        <span
          key={a.cor}
          style={{
            ["--cor" as string]: a.cor,
            ["--tempo" as string]: a.tempo,
            ["--atraso" as string]: a.atraso,
            width: a.largura,
            height: a.altura,
          }}
        />
      ))}
    </div>
  )
}
