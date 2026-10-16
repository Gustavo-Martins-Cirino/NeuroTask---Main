"use client"

import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { AuthBackdrop } from "@/components/auth-backdrop"
import { SeletorRegiao } from "@/components/seletor-regiao"
import { useIdioma, useSincronizarLangDoDocumento } from "@/hooks/use-idioma"
import { enfatizar } from "@/lib/enfase"
import { DOCUMENTOS, EMAIL_DE_CONTATO, type Bloco } from "@/lib/termos"

// Termos de uso + política de privacidade (/termos). Pública: quem ainda vai
// criar a conta precisa ler antes de concordar, então o proxy libera a rota.
//
// Mesmo fundo da landing e do cadastro — é a mesma porta de entrada. O texto
// mora em lib/termos.ts; aqui é só a forma.

function Paragrafo({ bloco }: { bloco: Bloco }) {
  if (Array.isArray(bloco)) {
    return (
      <ul className="space-y-1.5">
        {bloco.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
            <span>{enfatizar(item)}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p>{enfatizar(bloco)}</p>
}

export function TermosView() {
  // Fora do AppShell: como a landing, cuida sozinha do `lang` do documento.
  const idioma = useIdioma()
  useSincronizarLangDoDocumento(idioma)
  const doc = DOCUMENTOS[idioma]

  return (
    <AuthBackdrop className="justify-start py-12 sm:py-16">
      <article className="w-full max-w-2xl space-y-8">
        <header className="space-y-4">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {doc.voltar}
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight text-foreground">{doc.titulo}</h1>
            <p className="text-xs text-muted-foreground">{doc.atualizado}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
          <nav aria-label={doc.sumario} className="flex flex-wrap gap-2">
            {doc.partes.map((parte) => (
              <a
                key={parte.id}
                href={`#${parte.id}`}
                className="flex h-9 items-center rounded-lg border border-border/60 px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {parte.titulo}
              </a>
            ))}
          </nav>
        </header>

        {doc.partes.map((parte) => (
          <section
            key={parte.id}
            id={parte.id}
            aria-labelledby={`${parte.id}-titulo`}
            className="scroll-mt-6 space-y-7 rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-sm sm:p-8"
          >
            <h2 id={`${parte.id}-titulo`} className="text-xl font-semibold text-foreground">
              {parte.titulo}
            </h2>
            {parte.secoes.map((secao) => (
              <div key={secao.id} id={`${parte.id}-${secao.id}`} className="scroll-mt-6 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{secao.titulo}</h3>
                <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
                  {secao.blocos.map((bloco, i) => (
                    <Paragrafo key={i} bloco={bloco} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}

        <footer className="flex flex-col items-center gap-4 border-t border-border/30 pt-8 text-center">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{doc.contatoTitulo}</p>
            <a
              href={`mailto:${EMAIL_DE_CONTATO}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              {EMAIL_DE_CONTATO}
            </a>
          </div>
          <SeletorRegiao />
        </footer>
      </article>
    </AuthBackdrop>
  )
}
