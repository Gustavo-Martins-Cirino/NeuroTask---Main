"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AvatarFigure } from "@/components/avatar-figure"
import { Check, Headphones } from "lucide-react"
import {
  HAIR_STYLES, OUTFITS, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, BODY_TYPES,
  type AvatarConfig,
} from "@/lib/avatar"
import { type AvatarAccessories } from "@/lib/avatar-accessories"

interface AvatarEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: AvatarConfig
  /** Chapéu/óculos equipados na loja — não se editam aqui, mas a prévia
   *  precisa mostrá-los ou o que se comprou "some" fora da cena 3D. */
  accessories?: AvatarAccessories
  onSave: (cfg: AvatarConfig) => void
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
            value === c ? "border-primary ring-2 ring-primary/30" : "border-border/40"
          )}
          style={{ backgroundColor: c }}
          aria-label={c}
        />
      ))}
    </div>
  )
}

export function AvatarEditor({ open, onOpenChange, value, accessories, onSave }: AvatarEditorProps) {
  const [cfg, setCfg] = useState<AvatarConfig>(value)

  useEffect(() => {
    if (open) setCfg(value)
  }, [open, value])

  const chip = (selected: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      selected ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-border"
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar avatar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Preview ao vivo */}
          <div className="mx-auto flex w-36 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-b from-sky-100/60 to-sky-50/40 dark:from-slate-800 dark:to-slate-900">
            {/* viewBox centrado no boneco (que fica em x≈1, cabeça em -56 aos pés
                em ~16), não em x=-9 como antes — aquilo empurrava tudo para a
                direita e deixava uma faixa morta à esquerda. A sombra agora fica
                sob os pés, e não solta no canto inferior. */}
            <svg viewBox="-27 -58 57 80" className="h-44 w-32">
              <ellipse cx="1" cy="16" rx="12" ry="2.8" fill="#000" opacity="0.16" />
              <AvatarFigure config={cfg} accessories={accessories} />
            </svg>
          </div>

          {/* Opções */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Corpo</p>
              <div className="flex flex-wrap gap-1.5">
                {BODY_TYPES.map((b) => (
                  <button key={b.value} type="button" onClick={() => setCfg({ ...cfg, body: b.value })} className={chip(cfg.body === b.value)}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cabelo</p>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_STYLES.map((h) => (
                  <button key={h.value} type="button" onClick={() => setCfg({ ...cfg, hairStyle: h.value })} className={chip(cfg.hairStyle === h.value)}>
                    {h.label}
                  </button>
                ))}
              </div>
              <Swatches colors={HAIR_COLORS} value={cfg.hairColor} onPick={(c) => setCfg({ ...cfg, hairColor: c })} />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pele</p>
              <Swatches colors={SKIN_TONES} value={cfg.skin} onPick={(c) => setCfg({ ...cfg, skin: c })} />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Roupa</p>
              <div className="flex flex-wrap gap-1.5">
                {OUTFITS.map((o) => (
                  <button key={o.value} type="button" onClick={() => setCfg({ ...cfg, outfit: o.value })} className={chip(cfg.outfit === o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
              <Swatches colors={OUTFIT_COLORS} value={cfg.outfitColor} onPick={(c) => setCfg({ ...cfg, outfitColor: c })} />
            </div>

            <button
              type="button"
              onClick={() => setCfg({ ...cfg, headphones: !cfg.headphones })}
              className={chip(cfg.headphones)}
            >
              <Headphones className="mr-1 inline h-3.5 w-3.5" />
              Fones {cfg.headphones ? "on" : "off"}
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={() => onSave(cfg)}>
            <Check className="mr-1.5 h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
