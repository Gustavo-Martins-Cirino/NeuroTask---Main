import { cn } from "@/lib/utils"
import { type Regiao } from "@/lib/regiao"

// As bandeiras desenhadas à mão, e não como emoji (🇧🇷 / 🇺🇸).
//
// O motivo é concreto: o Windows não tem glifo para bandeira nenhuma. O emoji
// cai no par de letras que o compõe e vira "BR" e "US" em texto — o que é
// exatamente o oposto do que a referência queria, uma imagem que se reconhece
// antes de se ler. Como são só duas, desenhá-las custa menos que carregar uma
// fonte de emoji.

function Brasil() {
  return (
    <>
      <rect width="20" height="14" fill="#009b3a" />
      <path d="M 10 1.5 L 18.4 7 L 10 12.5 L 1.6 7 Z" fill="#fedf00" />
      <circle cx="10" cy="7" r="3.3" fill="#002776" />
      {/* A faixa branca. Some num ícone de 20px, e é justamente por isso que
          ela está aqui: o mesmo componente serve a tamanhos maiores. */}
      <path d="M 7 6.1 A 5 5 0 0 1 13.1 5.7 L 13 6.6 A 4.4 4.4 0 0 0 7.1 7 Z" fill="#fff" />
    </>
  )
}

function EstadosUnidos() {
  const faixa = 14 / 13
  return (
    <>
      <rect width="20" height="14" fill="#fff" />
      {/* 7 listras vermelhas de 13 — as de índice par, começando e terminando
          em vermelho, como na bandeira de verdade. */}
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={i * faixa} width="20" height={faixa} fill="#b22234" />
      ))}
      <rect width="8.5" height={faixa * 7} fill="#3c3b6e" />
      {/* As 50 estrelas viram pontos: nesta escala uma estrela de 5 pontas é
          uma mancha, e um ponto lê melhor do que uma mancha. */}
      {[0, 1, 2, 3].map((linha) =>
        [0, 1, 2, 3, 4].map((coluna) => (
          <circle
            key={`${linha}-${coluna}`}
            cx={1.1 + coluna * 1.6 + (linha % 2 ? 0.8 : 0)}
            cy={1 + linha * 1.7}
            r="0.42"
            fill="#fff"
          />
        ))
      )}
    </>
  )
}

export function Bandeira({ regiao, className }: { regiao: Regiao; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 14"
      className={cn("h-3.5 w-5 shrink-0 rounded-[2px] shadow-sm ring-1 ring-black/10", className)}
      aria-hidden
    >
      {regiao === "BR" ? <Brasil /> : <EstadosUnidos />}
    </svg>
  )
}
