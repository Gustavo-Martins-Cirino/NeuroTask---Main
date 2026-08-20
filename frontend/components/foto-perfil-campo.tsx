"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Loader2, Trash2, Upload, User, Armchair, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AvatarIniciais } from "@/components/avatar-iniciais"
import { createClient } from "@/lib/supabase/client"
import {
  enviarFotoPerfil, removerFotoPerfil, fetchRetrato, salvarAvatarModo,
  RETRATO_UPDATED_EVENT, type Retrato,
} from "@/lib/avatar"
import { erroDoArquivo } from "@/lib/foto-perfil"
import { parseAvatarModo, type AvatarModo } from "@/lib/avatar-modo"

// A foto de perfil, em Configurações → Perfil.
//
// UM caminho só, e ele é o lápis. Antes havia dois para a mesma coisa (clicar
// na foto e o botão "Enviar foto"), e nenhum dos dois deixava ESCOLHER entre o
// bonequinho e as iniciais — isso era decidido por cascata, pelas costas de quem
// montou um boneco a dedo. Agora o lápis abre as três opções e a escolha é
// explícita.
//
// A prévia é o MESMO AvatarIniciais do header, de propósito: é a única forma de
// ver, antes de sair da tela, exatamente o que vai aparecer lá em cima.

const OPCOES: { modo: AvatarModo; rotulo: string; icone: typeof User }[] = [
  { modo: "foto", rotulo: "Sua foto", icone: Upload },
  { modo: "boneco", rotulo: "Seu personagem", icone: Armchair },
  { modo: "iniciais", rotulo: "Iniciais do nome", icone: User },
]

export function FotoPerfilCampo({ nome }: { nome: string | null | undefined }) {
  const supabase = createClient()
  const entrada = useRef<HTMLInputElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const [foto, setFoto] = useState<string | null>(null)
  const [propria, setPropria] = useState(false)
  const [boneco, setBoneco] = useState<Retrato | null>(null)
  const [modo, setModo] = useState<AvatarModo>("foto")
  const [ocupado, setOcupado] = useState<"enviando" | "removendo" | null>(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const ler = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata ?? {}
      // `propria` separa a foto ENVIADA aqui da que veio do Google/GitHub: só a
      // primeira pode ser removida, e oferecer "Remover" para a outra seria um
      // botão que não faz nada (o próximo login a traria de volta).
      setPropria(Boolean(meta.foto_perfil))
      setFoto(meta.foto_perfil || meta.avatar_url || meta.picture || null)
      setModo(parseAvatarModo(meta.avatar_modo))
      fetchRetrato().then(setBoneco).catch(() => setBoneco(null))
    }
    ler()
    window.addEventListener(RETRATO_UPDATED_EVENT, ler)
    return () => window.removeEventListener(RETRATO_UPDATED_EVENT, ler)
  }, [supabase.auth])

  // Fecha ao clicar fora — é um menuzinho, não um diálogo.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("pointerdown", fora)
    return () => document.removeEventListener("pointerdown", fora)
  }, [aberto])

  const escolherModo = async (novo: AvatarModo) => {
    // "Sua foto" sem foto ainda: o passo seguinte é enviar uma, então o clique
    // abre o seletor de arquivo em vez de gravar uma escolha que não se cumpre.
    if (novo === "foto" && !foto) {
      entrada.current?.click()
      return
    }
    setModo(novo)
    setAberto(false)
    try {
      await salvarAvatarModo(novo)
    } catch {
      toast.error("Não deu para salvar a escolha.")
    }
  }

  const enviar = async (arquivo: File | undefined) => {
    if (!arquivo) return
    const problema = erroDoArquivo(arquivo)
    if (problema) {
      toast.error(problema)
      return
    }
    setOcupado("enviando")
    try {
      await enviarFotoPerfil(arquivo)
      // Enviar uma foto é dizer que se quer usá-la: seria estranho subir e a
      // pessoa continuar vendo o bonequinho.
      await salvarAvatarModo("foto")
      setModo("foto")
      setAberto(false)
      toast.success("Foto atualizada!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não deu para enviar a foto.")
    } finally {
      setOcupado(null)
      // Sem isto, escolher o MESMO arquivo de novo (depois de um erro) não
      // dispara change nenhum — o valor do input não mudou.
      if (entrada.current) entrada.current.value = ""
    }
  }

  const remover = async () => {
    setOcupado("removendo")
    try {
      await removerFotoPerfil()
      toast.success("Foto removida.")
    } catch {
      toast.error("Não deu para remover a foto.")
    } finally {
      setOcupado(null)
      setAberto(false)
    }
  }

  return (
    <div ref={raiz} className="relative flex items-center gap-4">
      <div className="relative shrink-0">
        <AvatarIniciais nome={nome} foto={foto} boneco={boneco} modo={modo} className="h-16 w-16 text-lg" />
        {/* O lápis: único caminho para trocar o retrato. */}
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          disabled={ocupado !== null}
          aria-label="Trocar o retrato"
          aria-expanded={aberto}
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
        >
          {ocupado ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
        </button>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium">Seu retrato</p>
        <p className="text-xs text-muted-foreground">
          {modo === "foto" ? "Usando sua foto" : modo === "boneco" ? "Usando seu personagem do Escritório" : "Usando as iniciais do nome"}
        </p>
      </div>

      {aberto && (
        <div className="absolute left-0 top-[4.5rem] z-50 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
          {OPCOES.map((o) => {
            const indisponivel = o.modo === "boneco" && !boneco
            return (
              <button
                key={o.modo}
                type="button"
                onClick={() => (indisponivel ? undefined : escolherModo(o.modo))}
                disabled={indisponivel || ocupado !== null}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  indisponivel ? "cursor-default opacity-45" : "hover:bg-accent"
                )}
              >
                <o.icone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.rotulo}</span>
                  {indisponivel && (
                    <span className="block text-[11px] text-muted-foreground">Monte um no Escritório</span>
                  )}
                  {o.modo === "foto" && !foto && (
                    <span className="block text-[11px] text-muted-foreground">Escolher um arquivo</span>
                  )}
                </span>
                {modo === o.modo && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            )
          })}

          {propria && (
            <>
              <span className="my-1 block h-px bg-border" />
              <button
                type="button"
                onClick={remover}
                disabled={ocupado !== null}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Remover a foto
              </button>
            </>
          )}
        </div>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => enviar(e.target.files?.[0])}
      />
    </div>
  )
}
