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
// Tudo em CSS (ver .borda-viva em globals.css): zero JS por quadro, e o
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
  // Em repouso a opacidade é bem mais baixa do que era (0,25): com o fundo em
  // arcos por trás, aquele valor virava uma MOLDURA colorida em volta da tela —
  // e o ponto do contorno é o contrário, não ser notado por quem não está
  // esperando resposta.
  const estilo = ativa
    ? { opacity: 0.9, ["--borda-duracao" as string]: "5s" }
    : { opacity: 0.08, ["--borda-duracao" as string]: "14s" }

  return (
    <>
      {/* O halo de 12px com blur é o que mais engrossava a moldura. Ele existe
          para o momento em que a borda ACENDE — em repouso não tem função, e
          some por completo. */}
      <div
        aria-hidden
        className={cn("borda-viva borda-viva-brilho transition-opacity duration-700", className)}
        style={{ ...estilo, opacity: ativa ? 0.9 : 0 }}
      />
      <div
        aria-hidden
        className={cn("borda-viva transition-opacity duration-700", className)}
        style={estilo}
      />
    </>
  )
}
