"use client"

import { useEffect, useRef } from "react"
import { useSoundMixer, type IdFaixa, type MixerTrackConfig, type SoundCategory } from "@/hooks/use-sound-mixer"
import { useDicionario } from "@/hooks/use-idioma"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  CloudRain, Coffee, TreePine, Waves, Flame, Bird, Droplets, Snowflake, TrainFront, PlaneTakeoff, BookOpen, Rocket,
  Piano, Music2, Skull, Castle, Headphones, GraduationCap, Brain, Wind,
  Volume2, Pause, Play, type LucideIcon,
} from "lucide-react"

// O nome de cada faixa mora no dicionário (`foco.mixer.faixas`). A config que
// vai para o hook fica sem ele, e continua sendo constante de MÓDULO: se ela
// fosse refeita ao trocar de idioma, a identidade mudaria e o áudio reiniciaria.
type TrackDef = Omit<MixerTrackConfig, "id"> & { id: IdFaixa; category: SoundCategory; icon: LucideIcon }

// Som declarado aqui PRECISA ter o arquivo em public/sounds — o botão aparece na
// tela e clicar nele não faz absolutamente nada quando o arquivo falta. Aconteceu
// com dois, "Vinil (chiado)" e "Oldies · Rádio antigo", que estavam na lista sem
// nunca terem tido mp3. Saíram; para trazer de volta é pôr o arquivo e
// re-adicionar a linha, e lib/sound-mixer-arquivos.test.ts vigia as duas pontas.
const TRACKS: TrackDef[] = [
  // Sons ambientes (loop contínuo)
  { id: "rain", src: "/sounds/rain.mp3", category: "ambient", icon: CloudRain },
  { id: "cafe", src: "/sounds/cafe.mp3", category: "ambient", icon: Coffee },
  { id: "forest", src: "/sounds/forest.mp3", category: "ambient", icon: TreePine },
  { id: "waves", src: "/sounds/waves.mp3", category: "ambient", icon: Waves },
  { id: "fire", src: "/sounds/fire.mp3", category: "ambient", icon: Flame },
  { id: "birds", src: "/sounds/birds.mp3", category: "ambient", icon: Bird },
  { id: "stream", src: "/sounds/stream.mp3", category: "ambient", icon: Droplets },
  { id: "snow", src: "/sounds/snow.mp3", category: "ambient", icon: Snowflake },
  { id: "train", src: "/sounds/train.mp3", category: "ambient", icon: TrainFront },
  { id: "flight", src: "/sounds/flight.mp3", category: "ambient", icon: PlaneTakeoff },
  { id: "library", src: "/sounds/library.mp3", category: "ambient", icon: BookOpen },
  { id: "space", src: "/sounds/space.mp3", category: "ambient", icon: Rocket },
  // Músicas (repetem com crossfade, sem corte abrupto)
  { id: "classical-piano", src: "/sounds/classical-piano.mp3", category: "music", icon: Piano },
  { id: "classical-piano2", src: "/sounds/classical-piano2.mp3", category: "music", icon: Piano },
  { id: "classical-orchestral", src: "/sounds/classical-orchestral.mp3", category: "music", icon: Music2 },
  { id: "dark-ambience", src: "/sounds/dark-ambience.mp3", category: "music", icon: Skull },
  { id: "dungeon-synth", src: "/sounds/dungeon-synth.mp3", category: "music", icon: Castle },
  { id: "lofi", src: "/sounds/lofi.mp3", category: "music", icon: Headphones },
  { id: "lofi2", src: "/sounds/lofi2.mp3", category: "music", icon: Headphones },
  { id: "chillhop", src: "/sounds/chillhop.mp3", category: "music", icon: Music2 },
  { id: "study", src: "/sounds/study.mp3", category: "music", icon: GraduationCap },
  { id: "study2", src: "/sounds/study2.mp3", category: "music", icon: GraduationCap },
  { id: "study-music", src: "/sounds/study-music.mp3", category: "music", icon: GraduationCap },
  // Foco (ruídos e frequências)
  { id: "binaural", src: "/sounds/bineural.mp3", category: "noise", icon: Brain },
  { id: "brown", src: "/sounds/brown-noise.mp3", category: "noise", icon: Wind },
]

const SECTIONS: SoundCategory[] = ["ambient", "music", "noise"]

const CONFIGS: MixerTrackConfig[] = TRACKS.map(({ id, src, synth, category }) => ({ id, src, synth, category }))

function Equalizer() {
  return (
    <div className="flex h-3 shrink-0 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-current"
          animate={{ height: ["30%", "100%", "50%", "90%", "30%"] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

export function SoundMixer() {
  const { tracks, toggleTrack, setVolume, masterVolume, setMasterVolume, pauseAll, resumeAll, paused, prime } = useSoundMixer(CONFIGS)
  const textos = useDicionario().foco.mixer
  const primedRef = useRef(false)

  // Retoma o mix salvo na primeira interação do usuário
  useEffect(() => {
    const onFirst = () => {
      if (primedRef.current) return
      primedRef.current = true
      prime()
    }
    window.addEventListener("pointerdown", onFirst, { once: true })
    return () => window.removeEventListener("pointerdown", onFirst)
  }, [prime])

  const anyActive = Object.values(tracks).some((t) => t.active)

  const renderCard = (t: TrackDef) => {
    const st = tracks[t.id]
    const Icon = t.icon
    const nome = textos.faixas[t.id]
    return (
      <div
        key={t.id}
        className={cn(
          "rounded-xl border p-3 transition-colors",
          st.active ? "border-current/40 bg-current/10" : "border-current/10 hover:border-current/25"
        )}
      >
        <button
          onClick={() => toggleTrack(t.id)}
          aria-label={st.active ? textos.desativar(nome) : textos.ativar(nome)}
          aria-pressed={st.active}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{nome}</span>
          </span>
          {st.active ? <Equalizer /> : <span className={cn("h-2 w-2 shrink-0 rounded-full", st.unavailable ? "bg-amber-500" : "bg-current/30")} />}
        </button>

        {st.active && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
            <Slider
              aria-label={textos.volumeDe(nome)}
              value={[Math.round(st.volume * 100)]}
              min={0}
              max={100}
              onValueChange={(v) => setVolume(t.id, v[0] / 100)}
            />
          </motion.div>
        )}

        {st.unavailable && !st.active && (
          <p className="mt-1 text-[10px] opacity-60">{textos.arquivoNaoEncontrado}</p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Volume master + pausar/continuar */}
      <div className="mb-4 flex items-center gap-3">
        <Volume2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <Slider
          aria-label={textos.volumeGeral}
          value={[Math.round(masterVolume * 100)]}
          min={0}
          max={100}
          onValueChange={(v) => setMasterVolume(v[0] / 100)}
          className="flex-1"
        />
        <button
          onClick={paused ? resumeAll : pauseAll}
          disabled={!anyActive}
          aria-label={paused ? textos.continuarTodos : textos.pararTodos}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30"
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? textos.continuar : textos.parar}
        </button>
      </div>

      {/* Seções: Sons · Músicas · Ruídos */}
      <div className="-mr-1 max-h-[52vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
        {SECTIONS.map((categoria) => {
          const items = TRACKS.filter((t) => t.category === categoria)
          if (items.length === 0) return null
          const activeCount = items.filter((t) => tracks[t.id]?.active).length
          return (
            <div key={categoria} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50">{textos.secoes[categoria]}</p>
                {activeCount > 0 && (
                  <span className="rounded-full bg-current/15 px-1.5 text-[9px] font-semibold tabular-nums opacity-70">{activeCount}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map(renderCard)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
