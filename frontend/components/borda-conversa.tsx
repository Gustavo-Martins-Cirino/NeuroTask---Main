import { cn } from "@/lib/utils"

// A borda colorida da conversa ao vivo com a Neuro.
// Referência: a borda do skiper-ui que o Gustavo mandou — contorno colorido
// acompanhando a tela inteira, com o miolo preto.
//
// Ela existe só aqui, e isso é a decisão, não um detalhe: a conversa ao vivo é
// a única tela do app que ocupa tudo e esconde o dock. Sem menu em volta, a
// borda é o que diz que você entrou em outro lugar — no chat comum, com o dock
// do lado, o mesmo efeito só faria uma página destoar das outras (duas rodadas
// de tentativa e o roadmap guardam essa história).
//
// O que se vê não é o giro, são as cores trocando de lugar entre as bordas: a
// volta é lenta e tem poucas cores, então não sobra nenhum detalhe para o olho
// seguir. A mecânica toda está em .borda-conversa (globals.css) — CSS puro,
// zero JS por quadro, e prefers-reduced-motion congela a volta sem apagar o
// contorno.

export function BordaConversa({ className }: { className?: string }) {
  return (
    <>
      {/* O halo desfocado que sangra para dentro. É ele que dá o volume: sem
          isso sobra um fio de 2px, que some numa tela desse tamanho. */}
      <div
        aria-hidden
        className={cn("borda-anel borda-anel-brilho borda-conversa", className)}
        style={{
          opacity: 0.5,
          ["--borda-duracao" as string]: "16s",
          // Mais grosso e mais desfocado que o padrão: numa tela inteira o halo de
          // 12px não sangra o bastante e a borda vira um fio de contorno.
          ["--borda-espessura" as string]: "20px",
          ["--borda-desfoque" as string]: "26px",
        }}
      />
      <div
        aria-hidden
        className={cn("borda-anel borda-conversa", className)}
        style={{ ["--borda-espessura" as string]: "2.5px", ["--borda-duracao" as string]: "16s" }}
      />
    </>
  )
}
