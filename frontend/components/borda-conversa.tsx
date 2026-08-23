import { cn } from "@/lib/utils"

// A borda colorida da conversa ao vivo com a Neuro.
// Referência: a borda do skiper-ui que o Gustavo mandou — luz colorida
// contornando a tela inteira, com o miolo preto.
//
// Ela existe só aqui, e isso é a decisão, não um detalhe: a conversa ao vivo é
// a única tela do app que ocupa tudo e esconde o dock. Sem menu em volta, a
// borda é o que diz que você entrou em outro lugar — no chat comum, com o dock
// do lado, o mesmo efeito só faria uma página destoar das outras (duas rodadas
// de tentativa e o roadmap guardam essa história).
//
// Não há fio de contorno aqui, só luz desfocada: a versão com uma linha nítida
// de 2px lia como MOLDURA, que é o oposto do que a referência passa. O gradiente
// tem buracos (ver .borda-conversa em globals.css), então o que corre em volta
// da tela são manchas de luz separadas por escuro — e mancha que passa é
// movimento, enquanto anel fechado é retângulo.
//
// Tudo em CSS: zero JS por quadro, e prefers-reduced-motion congela a volta sem
// apagar a luz.

export function BordaConversa({ className }: { className?: string }) {
  return (
    <>
      {/* A camada larga e lenta: a luz de fundo, que dá o volume. */}
      <div
        aria-hidden
        className={cn("borda-anel borda-anel-brilho borda-conversa", className)}
        style={{
          opacity: 0.45,
          ["--borda-duracao" as string]: "34s",
          ["--borda-espessura" as string]: "42px",
          ["--borda-desfoque" as string]: "46px",
        }}
      />
      {/* A camada estreita, ao contrário e mais rápida. Onde as duas se cruzam o
          brilho soma — e como um tempo não é múltiplo do outro, o encontro nunca
          cai duas vezes no mesmo canto. É esse desencontro que faz a luz parecer
          viva, em vez de um laço curto repetindo. */}
      <div
        aria-hidden
        className={cn("borda-anel borda-anel-brilho borda-conversa borda-conversa-inversa", className)}
        style={{
          opacity: 0.8,
          ["--borda-duracao" as string]: "22s",
          ["--borda-espessura" as string]: "18px",
          ["--borda-desfoque" as string]: "22px",
        }}
      />
    </>
  )
}
