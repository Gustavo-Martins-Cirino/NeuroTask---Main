"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  provedoresHabilitados, lembrarMetodo, metodoLembrado,
  ROTULO_PROVEDOR, type Metodo, type Provedor,
} from "@/lib/auth-metodos"

// Entrar com Google/GitHub/Apple, mais o selo do método usado da última vez.
// Referência: components/inspirações/better-auth-6.webp.
//
// Os botões só aparecem se `NEXT_PUBLIC_OAUTH_PROVIDERS` listar o provedor —
// ver lib/auth-metodos.ts para o porquê. A leitura precisa ser literal: o Next
// substitui `process.env.NEXT_PUBLIC_*` no bundle em tempo de build, e só
// reconhece a forma escrita por extenso.
const HABILITADOS = provedoresHabilitados(process.env.NEXT_PUBLIC_OAUTH_PROVIDERS)

// Marcas em SVG inline: o lucide-react não traz logos de empresa, e cada uma
// tem regra de uso própria — desenhar "parecido" seria pior do que a oficial.
const MARCAS: Record<Provedor, { titulo: string; svg: React.ReactNode }> = {
  google: {
    titulo: "Google",
    svg: (
      <>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
      </>
    ),
  },
  github: {
    titulo: "GitHub",
    svg: (
      <path
        fill="currentColor"
        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.26.8-.57v-2.2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.66-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.4 1.24-3.24-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.24a11.5 11.5 0 0 1 6.01 0c2.29-1.56 3.3-1.24 3.3-1.24.65 1.65.24 2.88.12 3.18a4.7 4.7 0 0 1 1.23 3.24c0 4.63-2.81 5.65-5.49 5.95.44.37.82 1.1.82 2.22v3.29c0 .31.2.68.81.57A12 12 0 0 0 12 .3Z"
      />
    ),
  },
  apple: {
    titulo: "Apple",
    svg: (
      <path
        fill="currentColor"
        d="M17.05 12.74c-.02-2.4 1.96-3.55 2.05-3.61-1.12-1.63-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.64.87-.75 0-1.91-.85-3.14-.83-1.61.02-3.1.94-3.93 2.38-1.68 2.9-.43 7.2 1.2 9.55.8 1.15 1.75 2.44 3 2.4 1.2-.05 1.66-.78 3.11-.78 1.46 0 1.87.78 3.14.75 1.3-.02 2.12-1.17 2.91-2.33.92-1.33 1.3-2.63 1.32-2.7-.03-.01-2.53-.97-2.55-3.85M14.68 5.2c.66-.8 1.11-1.92.99-3.03-.95.04-2.11.63-2.8 1.43-.61.71-1.15 1.85-1 2.94 1.06.08 2.14-.54 2.81-1.34" />
    ),
  },
}

function Marca({ provedor }: { provedor: Provedor }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden focusable="false">
      {MARCAS[provedor].svg}
    </svg>
  )
}

/**
 * O último método usado, lido só depois da hidratação. No primeiro render é
 * sempre null de propósito: o servidor não tem localStorage, e devolver algo
 * aqui daria diferença entre o HTML do servidor e o do cliente.
 */
export function useUltimoMetodo(): Metodo | null {
  const [ultimo, setUltimo] = useState<Metodo | null>(null)
  useEffect(() => setUltimo(metodoLembrado()), [])
  return ultimo
}

/** O selo da referência: discreto, só marca onde a pessoa entrou da última vez. */
export function SeloUltimoUso({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground/70",
        className
      )}
    >
      último acesso
    </span>
  )
}

export function SocialLogin({
  modo,
  mostrarSelo = false,
}: {
  modo: "entrar" | "criar"
  /** Só a tela de entrar marca o último método; na de criar conta confundiria. */
  mostrarSelo?: boolean
}) {
  const [indo, setIndo] = useState<Provedor | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const ultimo = useUltimoMetodo()
  const supabase = createClient()

  if (HABILITADOS.length === 0) return null

  const entrar = async (provedor: Provedor) => {
    setErro(null)
    setIndo(provedor)
    // Guardado ANTES de sair da página: o OAuth leva a pessoa embora e não há
    // volta ao código daqui. Quem desistir na tela do provedor deixa o selo
    // apontando para ele — impreciso, mas é uma dica, não um dado.
    lembrarMetodo(provedor)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provedor,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      // O caso comum é o provedor não estar habilitado no painel do Supabase.
      setErro(`Não deu para entrar com ${ROTULO_PROVEDOR[provedor]}. Tente pelo email.`)
      setIndo(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        {HABILITADOS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => entrar(p)}
            disabled={indo !== null}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-card/40 px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {indo === p ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Marca provedor={p} />}
            {modo === "entrar" ? "Entrar" : "Criar conta"} com {ROTULO_PROVEDOR[p]}
            {mostrarSelo && ultimo === p && <SeloUltimoUso className="ml-1" />}
          </button>
        ))}
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  )
}
