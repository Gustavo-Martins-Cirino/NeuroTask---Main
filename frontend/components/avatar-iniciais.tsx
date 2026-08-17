"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { iniciaisDoNome, matizDoNome } from "@/lib/iniciais"
import { AvatarRetrato } from "@/components/avatar-figure"
import { type Retrato } from "@/lib/avatar"

// O retrato da pessoa no header, em três degraus — do mais específico ao mais
// genérico: a foto da conta, o bonequinho montado no editor, as iniciais.
// Referência: components/inspirações/Captura de tela 2026-08-07 213710.png.
//
// A foto ganha do bonequinho porque é um rosto de verdade, e porque quem entrou
// por Google/GitHub já reconhece aquela imagem de outros apps. O bonequinho
// ganha das iniciais porque foi escolhido a dedo, peça por peça.
//
// A cor das iniciais sai do nome (lib/iniciais.ts decide a matiz) e o
// claro/escuro sai do CSS: `--iniciais-fundo` e `--iniciais-texto` em
// globals.css guardam o par luminosidade/croma de cada tema, e aqui só entra a
// matiz. Assim a mesma pessoa tem a mesma cor nos dois temas, cada um com o
// contraste dele — sem o componente precisar saber em que tema está.

export function AvatarIniciais({
  nome,
  foto,
  boneco,
  className,
  title,
}: {
  nome: string | null | undefined
  /** Foto de perfil, quando existe (ex.: a da conta Google). Ganha de todo o resto. */
  foto?: string | null
  /** O bonequinho do editor, quando a pessoa montou um. Ganha das iniciais. */
  boneco?: Retrato | null
  className?: string
  title?: string
}) {
  const iniciais = iniciaisDoNome(nome)
  const matiz = matizDoNome(nome)
  // Link de foto quebra: conta antiga, URL expirada, provedor fora do ar. Sem
  // isto sobraria o retângulo de imagem quebrada, que é pior que as iniciais.
  const [fotoFalhou, setFotoFalhou] = useState(false)

  // `shrink-0` e `aspect-square` não são detalhe: este avatar vive dentro de
  // botões que têm padding próprio, e como item de flex ele era ESPREMIDO na
  // largura enquanto mantinha a altura — virava uma elipse.
  const base = "shrink-0 aspect-square overflow-hidden rounded-full"

  if (foto && !fotoFalhou) {
    return (
      // <img> e não next/image de propósito: a foto vem de domínio de terceiro
      // (lh3.googleusercontent.com e afins) e o next/image exigiria cadastrar
      // cada domínio em next.config — um provedor novo quebraria a foto.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={title ?? ""}
        title={title}
        onError={() => setFotoFalhou(true)}
        // Alguns provedores devolvem 403 quando o referrer vai junto.
        referrerPolicy="no-referrer"
        className={cn(base, "object-cover", className)}
      />
    )
  }

  if (boneco) {
    return (
      <span
        className={cn(base, "flex items-center justify-center bg-primary/10", className)}
        title={title}
        aria-hidden={title ? undefined : true}
      >
        <AvatarRetrato config={boneco.config} accessories={boneco.accessories} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        base,
        "flex select-none items-center justify-center font-semibold leading-none",
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
