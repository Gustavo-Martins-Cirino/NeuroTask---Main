"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AvatarIniciais } from "@/components/avatar-iniciais"
import { createClient } from "@/lib/supabase/client"
import {
  enviarFotoPerfil, removerFotoPerfil, fetchRetrato,
  RETRATO_UPDATED_EVENT, type Retrato,
} from "@/lib/avatar"
import { erroDoArquivo } from "@/lib/foto-perfil"

// A foto de perfil, em Configurações → Perfil.
//
// A prévia é o MESMO AvatarIniciais do header, de propósito: é a única forma de
// a pessoa ver, antes de sair da tela, exatamente o que vai aparecer lá em cima
// — inclusive o degrau em que ela está (foto enviada, foto do provedor,
// bonequinho do Escritório ou iniciais).

export function FotoPerfilCampo({ nome }: { nome: string | null | undefined }) {
  const supabase = createClient()
  const entrada = useRef<HTMLInputElement>(null)
  const [foto, setFoto] = useState<string | null>(null)
  const [propria, setPropria] = useState(false)
  const [boneco, setBoneco] = useState<Retrato | null>(null)
  const [ocupado, setOcupado] = useState<"enviando" | "removendo" | null>(null)

  useEffect(() => {
    const ler = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata ?? {}
      // `propria` separa a foto ENVIADA aqui da que veio do Google/GitHub: só a
      // primeira pode ser removida, e oferecer "Remover" para a outra seria um
      // botão que não faz nada (o próximo login a traria de volta).
      setPropria(Boolean(meta.foto_perfil))
      setFoto(meta.foto_perfil || meta.avatar_url || meta.picture || null)
      fetchRetrato().then(setBoneco).catch(() => setBoneco(null))
    }
    ler()
    window.addEventListener(RETRATO_UPDATED_EVENT, ler)
    return () => window.removeEventListener(RETRATO_UPDATED_EVENT, ler)
  }, [supabase.auth])

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    const problema = erroDoArquivo(arquivo)
    if (problema) {
      toast.error(problema)
      return
    }
    setOcupado("enviando")
    try {
      await enviarFotoPerfil(arquivo)
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
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={ocupado !== null}
        className="group relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
        title="Trocar a foto"
      >
        <AvatarIniciais nome={nome} foto={foto} boneco={boneco} className="h-16 w-16 text-lg" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {ocupado === "enviando"
            ? <Loader2 className="h-5 w-5 animate-spin text-white" />
            : <Camera className="h-5 w-5 text-white" />}
        </span>
      </button>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={ocupado !== null}
            className="flex h-9 items-center gap-2 rounded-lg border border-border/50 px-3 text-sm font-medium transition-colors hover:border-border disabled:opacity-40"
          >
            {ocupado === "enviando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {foto ? "Trocar foto" : "Enviar foto"}
          </button>
          {propria && (
            <button
              type="button"
              onClick={remover}
              disabled={ocupado !== null}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
            >
              {ocupado === "removendo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          A imagem é recortada num quadrado pelo centro e reduzida antes de sair do seu aparelho.
        </p>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
    </div>
  )
}
