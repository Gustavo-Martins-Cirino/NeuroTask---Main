"use client"

import { cn } from "@/lib/utils"

// O contorno que gira em volta da tela, estilo Apple Intelligence.
// Referência: components/inspirações/Captura de tela 2026-08-07 214418.png.
//
// Não é só enfeite: ele ACENDE enquanto a Neuro responde. Foi o que fez o
// efeito ganhar lugar aqui e não em qualquer página — na tela do chat o estado
// "respondendo" dura de verdade (o streaming leva segundos), então há o que
// sinalizar. Em repouso fica quase invisível, que é o ponto: quem não está
// esperando resposta nenhuma não deve reparar nele.
//
// Tudo em CSS (a mecânica do anel é a .borda-anel, compartilhada com a borda
// da conversa ao vivo): zero JS por quadro, e o
// prefers-reduced-motion congela o giro sem apagar o contorno.

export function BordaViva({
  ativa = false,
  className,
}: {
  /** Verdadeiro enquanto a resposta está chegando. */
  ativa?: boolean
  className?: string
}) {
  // Aceso: mais forte e girando quase três vezes mais rápido.
  //
  // Em repouso é quase nada (0,08). Em 0,25, com qualquer cor no fundo, o
  // contorno virava uma MOLDURA em volta da tela — e o ponto dele é o oposto:
  // quem não está esperando resposta não deve reparar que existe.
  const estilo = ativa
    ? { opacity: 0.9, ["--borda-duracao" as string]: "5s" }
    : { opacity: 0.08, ["--borda-duracao" as string]: "14s" }

  return (
    <>
      {/* O halo de 12px com blur é o que engrossa a borda. Serve ao momento em
          que ela ACENDE; em repouso não tem função e some por completo. */}
      <div
        aria-hidden
        className={cn("borda-anel borda-anel-brilho borda-viva borda-viva-brilho transition-opacity duration-700", className)}
        style={{ ...estilo, opacity: ativa ? 0.9 : 0 }}
      />
      <div
        aria-hidden
        className={cn("borda-anel borda-viva transition-opacity duration-700", className)}
        style={estilo}
      />
    </>
  )
}
