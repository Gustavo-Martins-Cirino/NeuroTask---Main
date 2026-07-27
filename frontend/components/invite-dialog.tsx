"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import { sendMeetingInvite } from "@/lib/invites"
import { suggestCommonFreeSlots, type FreeSlot } from "@/lib/friends"
import { toast } from "sonner"
import { CalendarPlus, Loader2, Video, MapPin, Sparkles } from "lucide-react"

interface InviteDialogProps {
  friend: {
    friend_id: string
    username: string
    display_name: string | null
    can_schedule?: boolean
  } | null
  onClose: () => void
  onSent: () => void
}

const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function nextHour(): string {
  const d = new Date(Date.now() + 3_600_000)
  return `${String(d.getHours()).padStart(2, "0")}:00`
}

function plusHour(hm: string): string {
  const [h, m] = hm.split(":").map(Number)
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function InviteDialog({ friend, onClose, onSent }: InviteDialogProps) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState(nextHour())
  const [end, setEnd] = useState(plusHour(nextHour()))
  const [url, setUrl] = useState("")
  const [location, setLocation] = useState("")
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState<FreeSlot[] | null>(null)
  const [suggesting, setSuggesting] = useState(false)

  useEffect(() => {
    if (friend) {
      setTitle("")
      setDate(todayISO())
      const s = nextHour()
      setStart(s)
      setEnd(plusHour(s))
      setUrl("")
      setLocation("")
      setSlots(null)
    }
  }, [friend])

  // Duração escolhida nos campos "das/às" — é ela que o sugeridor tenta encaixar
  const durationMinutes = (() => {
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = end.split(":").map(Number)
    const diff = eh * 60 + em - (sh * 60 + sm)
    return diff > 0 ? diff : diff + 24 * 60
  })()

  const handleSuggest = async () => {
    if (!friend) return
    setSuggesting(true)
    const { slots: found, error } = await suggestCommonFreeSlots(friend.friend_id, date, durationMinutes)
    setSuggesting(false)
    if (error) {
      toast.error(error)
      return
    }
    setSlots(found ?? [])
  }

  const handleSend = async () => {
    if (!friend) return
    const startsAt = new Date(`${date}T${start}:00`)
    let endsAt = new Date(`${date}T${end}:00`)
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 3_600_000) // cruza meia-noite
    setLoading(true)
    const { error } = await sendMeetingInvite({
      toUserId: friend.friend_id,
      title: title.trim(),
      startsAt,
      endsAt,
      meetingUrl: url.trim() || undefined,
      location: location.trim() || undefined,
    })
    setLoading(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(`Convite enviado para @${friend.username}! Quando aceitar, entra na agenda dos dois.`)
    onSent()
    onClose()
  }

  return (
    <Dialog open={!!friend} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            Convidar {friend?.display_name ?? `@${friend?.username}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título — ex.: Reunião de alinhamento"
            className="h-10"
          />

          <DatePicker value={date} onChange={setDate} />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Das</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-9 rounded-lg border border-border/50 bg-transparent px-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <span className="text-xs text-muted-foreground">às</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-9 rounded-lg border border-border/50 bg-transparent px-2 text-sm outline-none transition-colors focus:border-primary/40"
            />
          </div>

          {friend?.can_schedule && (
            <div className="space-y-1.5 rounded-xl border border-border/50 p-2.5">
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting}
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
              >
                {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Sugerir horário livre dos dois
              </button>
              {slots !== null && (
                slots.length === 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Nenhuma janela de {durationMinutes}min livre para os dois nesse dia.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map((s) => (
                      <button
                        key={s.start.toISOString()}
                        type="button"
                        onClick={() => {
                          setStart(hm(s.start))
                          setEnd(hm(s.end))
                          setSlots(null)
                        }}
                        className="rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-medium tabular-nums text-primary transition-colors hover:bg-primary/15"
                      >
                        {hm(s.start)}–{hm(s.end)}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link — Meet, Zoom… (opcional)"
              className="h-9 text-sm"
              inputMode="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local — sala, endereço… (opcional)"
              className="h-9 text-sm"
            />
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Quando o convite for aceito, o compromisso entra automaticamente no calendário de vocês dois.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSend} disabled={loading || !title.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
