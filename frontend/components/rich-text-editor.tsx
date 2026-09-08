"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useDicionario } from "@/hooks/use-idioma"
import {
  Bold, Italic, Underline, List, ListOrdered, Heading,
  Undo2, Redo2, Palette, Minus, Plus, X,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

// Paleta estilo Notion: cores de texto + fundos translúcidos que ficam
// legíveis tanto no tema claro quanto no escuro (o texto mantém a cor do tema)
//
// A `chave` é o nome no dicionário; o `label` saiu. "Padrão" e "Sem fundo" têm
// chave própria porque não são cor: são a AUSÊNCIA de uma, e cada idioma diz
// isso do jeito dele.
type ChavePaleta = "vermelho" | "laranja" | "amarelo" | "verde" | "azul" | "roxo" | "rosa"

const TEXT_COLORS: { chave: ChavePaleta | null; value: string }[] = [
  { chave: null, value: "" },
  { chave: "vermelho", value: "#ef4444" },
  { chave: "laranja", value: "#f97316" },
  { chave: "amarelo", value: "#eab308" },
  { chave: "verde", value: "#22c55e" },
  { chave: "azul", value: "#3b82f6" },
  { chave: "roxo", value: "#8b5cf6" },
  { chave: "rosa", value: "#ec4899" },
]
const BG_COLORS: { chave: ChavePaleta | null; value: string }[] = [
  { chave: null, value: "transparent" },
  { chave: "amarelo", value: "rgba(234,179,8,0.32)" },
  { chave: "laranja", value: "rgba(249,115,22,0.30)" },
  { chave: "verde", value: "rgba(34,197,94,0.28)" },
  { chave: "azul", value: "rgba(59,130,246,0.28)" },
  { chave: "roxo", value: "rgba(139,92,246,0.30)" },
  { chave: "rosa", value: "rgba(236,72,153,0.28)" },
]

// P/M/G é português. A letra vem do dicionário — em inglês são S/M/L.
const SIZES: { chave: "pequeno" | "medio" | "grande"; size: string; cls: string }[] = [
  { chave: "pequeno", size: "2", cls: "text-xs" },
  { chave: "medio", size: "3", cls: "text-sm" },
  { chave: "grande", size: "5", cls: "text-base" },
]

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useDicionario().notas.editor
  const ref = useRef<HTMLDivElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const selectedImgRef = useRef<HTMLImageElement | null>(null)
  const [imgPct, setImgPct] = useState<number | null>(null)

  // Define o conteúdo inicial uma vez (não-controlado, evita pulo de cursor)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    emit()
  }

  const execStyled = (cmd: string, val: string) => {
    ref.current?.focus()
    document.execCommand("styleWithCSS", false, "true")
    document.execCommand(cmd, false, val)
    document.execCommand("styleWithCSS", false, "false")
    emit()
    setPaletteOpen(false)
  }

  // ---- Imagem selecionável e redimensionável ----
  const clearImgSelection = () => {
    const img = selectedImgRef.current
    if (img) {
      img.style.outline = ""
      img.style.outlineOffset = ""
    }
    selectedImgRef.current = null
    setImgPct(null)
  }

  const handleEditorClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (t.tagName === "IMG") {
      clearImgSelection()
      const img = t as HTMLImageElement
      img.style.outline = "2px solid #6366f1"
      img.style.outlineOffset = "2px"
      selectedImgRef.current = img
      const w = parseInt(img.style.width || "100", 10)
      setImgPct(isNaN(w) ? 100 : w)
    } else if (selectedImgRef.current) {
      clearImgSelection()
    }
  }

  const resizeImg = (delta: number) => {
    const img = selectedImgRef.current
    if (!img || imgPct === null) return
    const next = Math.min(100, Math.max(15, imgPct + delta))
    img.style.width = `${next}%`
    img.style.height = "auto"
    setImgPct(next)
    emit()
  }

  const setImgFull = () => {
    const img = selectedImgRef.current
    if (!img) return
    img.style.width = "100%"
    img.style.height = "auto"
    setImgPct(100)
    emit()
  }

  useEffect(() => () => clearImgSelection(), [])

  const Btn = ({ onClick, active, children, label }: { onClick: () => void; active?: boolean; children: React.ReactNode; label: string }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", active && "text-foreground")}
    >
      {children}
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/40 px-3 py-2">
        <Btn onClick={() => exec("undo")} label={editor.desfazer}><Undo2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("redo")} label={editor.refazer}><Redo2 className="h-4 w-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border/60" />

        <Btn onClick={() => exec("bold")} label={editor.negrito}><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("italic")} label={editor.italico}><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("underline")} label={editor.sublinhado}><Underline className="h-4 w-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border/60" />

        {SIZES.map((s) => (
          <button
            key={s.size}
            type="button"
            title={editor.tamanhoDica(editor.tamanhos[s.chave])}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("fontSize", s.size)}
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", s.cls)}
          >
            A
          </button>
        ))}
        <Btn onClick={() => exec("formatBlock", "<h2>")} label={editor.titulo}><Heading className="h-4 w-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border/60" />

        <Btn onClick={() => exec("insertUnorderedList")} label={editor.lista}><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} label={editor.listaNumerada}><ListOrdered className="h-4 w-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border/60" />

        {/* Cores (estilo Notion: texto + fundo num só menu) */}
        <div className="relative">
          <Btn onClick={() => setPaletteOpen((o) => !o)} label={editor.cores} active={paletteOpen}>
            <Palette className="h-4 w-4" />
          </Btn>
          {paletteOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 top-9 z-20 w-56 space-y-2.5 rounded-xl border border-border/50 bg-popover p-3 shadow-lg"
            >
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{editor.corDoTexto}</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.chave ?? "padrao"}
                      type="button"
                      title={c.chave ? editor.paleta[c.chave] : editor.corPadrao}
                      onClick={() => execStyled("foreColor", c.value || "inherit")}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-border/40 text-xs font-bold transition-transform hover:scale-110"
                      style={c.value ? { color: c.value } : undefined}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{editor.fundoMarcaTexto}</p>
                <div className="flex flex-wrap gap-1.5">
                  {BG_COLORS.map((c) => (
                    <button
                      key={c.chave ?? "sem-fundo"}
                      type="button"
                      title={c.chave ? editor.paleta[c.chave] : editor.semFundo}
                      onClick={() => execStyled("hiliteColor", c.value)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-border/40 text-xs transition-transform hover:scale-110"
                      style={{ backgroundColor: c.value === "transparent" ? undefined : c.value }}
                    >
                      {c.value === "transparent" ? <X className="h-3 w-3 text-muted-foreground" /> : "A"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles da imagem selecionada */}
      {imgPct !== null && (
        <div className="flex items-center gap-1.5 border-b border-border/40 bg-accent/30 px-3 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium">{editor.imagem}</span>
          <span className="mx-1 h-4 w-px bg-border/60" />
          <button type="button" onClick={() => resizeImg(-10)} title={editor.diminuir} className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-10 text-center font-semibold tabular-nums">{imgPct}%</span>
          <button type="button" onClick={() => resizeImg(10)} title={editor.aumentar} className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={setImgFull} className="rounded-md px-2 py-0.5 transition-colors hover:bg-accent hover:text-foreground">
            100%
          </button>
          <button type="button" onClick={clearImgSelection} className="ml-auto rounded-md px-2 py-0.5 transition-colors hover:bg-accent hover:text-foreground">
            {editor.concluir}
          </button>
        </div>
      )}

      {/* Área editável */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onClick={handleEditorClick}
        data-placeholder={placeholder}
        className="note-editor scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed [&_img]:my-2 [&_img]:max-w-full [&_img]:cursor-pointer [&_img]:rounded-lg"
      />
    </div>
  )
}
