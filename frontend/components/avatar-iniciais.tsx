"use client"

import { cn } from "@/lib/utils"
import { iniciaisDoNome, matizDoNome } from "@/lib/iniciais"

// O círculo com as iniciais, para quem ainda não montou o bonequinho.
// Referência: components/inspirações/Captura de tela 2026-08-07 213710.png.
//
// A cor sai do nome (lib/iniciais.ts decide a matiz) e o claro/escuro sai do
// CSS: `--iniciais-fundo` e `--iniciais-texto` em globals.css guardam o par
// luminosidade/croma de cada tema, e aqui só entra a matiz. Assim a mesma
// pessoa tem a mesma cor nos dois temas, cada um com o contraste dele — sem o
// componente precisar saber em que tema está.

export function AvatarIniciais({
  nome,
  className,
  title,
}: {
  nome: string | null | undefined
  className?: string
  title?: string
}) {
  const iniciais = iniciaisDoNome(nome)
  const matiz = matizDoNome(nome)

  return (
    <span
      className={cn(
        "flex select-none items-center justify-center rounded-full font-semibold leading-none",
        className
      )}
      style={{
        backgroundColor: `oklch(var(--iniciais-fundo) ${matiz})`,
        color: `oklch(var(--iniciais-texto) ${matiz})`,
      }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      {iniciais}
    </span>
  )
}
