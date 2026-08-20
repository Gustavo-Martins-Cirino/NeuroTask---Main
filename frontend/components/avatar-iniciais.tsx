"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { iniciaisDoNome, matizDoNome } from "@/lib/iniciais"
import { AvatarRetrato } from "@/components/avatar-figure"
import { type Retrato } from "@/lib/avatar"
import { resolverModo, type AvatarModo } from "@/lib/avatar-modo"

// O retrato da pessoa no header: a foto da conta, o bonequinho montado no
// editor ou as iniciais.
// Referência: components/inspirações/Captura de tela 2026-08-07 213710.png.
//
// QUEM decide é a pessoa (Configurações → Perfil → lápis). Esta ordem — foto,
// bonequinho, iniciais — sobrou como FALLBACK, para quando o que foi escolhido
// não existe: escolher a foto e depois removê-la não pode deixar um buraco no
// header. Ver lib/avatar-modo.
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
  modo,
  className,
  title,
}: {
  nome: string | null | undefined
  /** Foto de perfil, quando existe (ex.: a da conta Google). Ganha de todo o resto. */
  foto?: string | null
  /** O bonequinho do editor, quando a pessoa montou um. */
  boneco?: Retrato | null
  /** O que a pessoa escolheu em Configurações. Ausente = cascata de sempre. */
  modo?: AvatarModo | null
  className?: string
  title?: string
}) {
  const iniciais = iniciaisDoNome(nome)
  // Link de foto quebrado conta como "não tem foto": assim a escolha cai no
  // bonequinho em vez de insistir num endereço morto.
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const usar = resolverModo(modo ?? "foto", {
    temFoto: Boolean(foto) && !fotoFalhou,
    temBoneco: Boolean(boneco),
  })
  const matiz = matizDoNome(nome)
  // `shrink-0` e `aspect-square` não são detalhe: este avatar vive dentro de
  // botões que têm padding próprio, e como item de flex ele era ESPREMIDO na
  // largura enquanto mantinha a altura — virava uma elipse.
  const base = "shrink-0 aspect-square overflow-hidden rounded-full"

  if (usar === "foto" && foto) {
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

  if (usar === "boneco" && boneco) {
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
