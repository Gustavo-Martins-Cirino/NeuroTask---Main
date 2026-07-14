"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SoundCategory = "ambient" | "music" | "noise"

export interface MixerTrackConfig {
  id: string
  label: string
  src?: string
  synth?: "white" | "brown"
  category?: SoundCategory
}

export interface MixerTrackState {
  volume: number
  active: boolean
  unavailable: boolean
}

const FADE = 0.3 // segundos (fade in/out ao ligar/desligar)
const CROSSFADE = 2.5 // segundos de sobreposição entre repetições de música
const STORAGE_KEY = "neurotask-sound-mixer"

// Loop nativo (ambiente/ruído): {kind:"loop"}. Música com crossfade: {kind:"music"}.
type Controller =
  | { kind: "loop"; gain: GainNode; src: AudioBufferSourceNode }
  | { kind: "music"; gain: GainNode; timer: ReturnType<typeof setTimeout> | null; stopped: boolean; sources: Set<AudioBufferSourceNode> }

function makeNoiseBuffer(ctx: AudioContext, type: "white" | "brown"): AudioBuffer {
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  if (type === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  } else {
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  return buf
}

export function useSoundMixer(configs: MixerTrackConfig[]) {
  const [tracks, setTracks] = useState<Record<string, MixerTrackState>>(() =>
    Object.fromEntries(configs.map((c) => [c.id, { volume: 0.5, active: false, unavailable: false }]))
  )
  const [masterVolume, setMasterVolumeState] = useState(0.8)
  const [paused, setPaused] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map())
  const activeNodes = useRef<Map<string, Controller>>(new Map())
  // Starts em andamento (fetch+decode é lento em rede real): marca ANTES do
  // await para impedir start duplo e permitir cancelar via stopTrack
  const pendingStarts = useRef<Set<string>>(new Set())
  const stateRef = useRef(tracks)
  stateRef.current = tracks
  const masterVolRef = useRef(masterVolume)
  masterVolRef.current = masterVolume
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // Restaura mix salvo
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { tracks?: Record<string, { volume: number; active: boolean }>; master?: number }
      if (typeof parsed.master === "number") setMasterVolumeState(parsed.master)
      if (parsed.tracks) {
        setTracks((prev) => {
          const next = { ...prev }
          for (const c of configs) {
            const s = parsed.tracks![c.id]
            if (s) next[c.id] = { volume: s.volume, active: s.active, unavailable: false }
          }
          // Saneia mixes salvos antes da regra de exclusividade: no máximo
          // UMA música ativa (senão o prime() toca duas ao mesmo tempo)
          let musicSeen = false
          for (const c of configs) {
            if (c.category !== "music" || !next[c.id]?.active) continue
            if (musicSeen) next[c.id] = { ...next[c.id], active: false }
            musicSeen = true
          }
          return next
        })
      }
    } catch {
      /* ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persiste mix
  useEffect(() => {
    const data = {
      master: masterVolume,
      tracks: Object.fromEntries(Object.entries(tracks).map(([k, v]) => [k, { volume: v.volume, active: v.active }])),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [tracks, masterVolume])

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = masterVolRef.current
      master.connect(ctx.destination)
      ctxRef.current = ctx
      masterRef.current = master
    }
    if (ctxRef.current.state === "suspended" && !pausedRef.current) ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const getBuffer = useCallback(
    async (cfg: MixerTrackConfig): Promise<AudioBuffer> => {
      if (bufferCache.current.has(cfg.id)) return bufferCache.current.get(cfg.id)!
      const ctx = ensureCtx()
      let buf: AudioBuffer
      if (cfg.synth) {
        buf = makeNoiseBuffer(ctx, cfg.synth)
      } else {
        const res = await fetch(cfg.src!)
        if (!res.ok) throw new Error(`Falha ao carregar ${cfg.src}`)
        buf = await ctx.decodeAudioData(await res.arrayBuffer())
      }
      bufferCache.current.set(cfg.id, buf)
      return buf
    },
    [ensureCtx]
  )

  const startTrack = useCallback(
    async (id: string) => {
      if (activeNodes.current.has(id) || pendingStarts.current.has(id)) return
      const cfg = configs.find((c) => c.id === id)
      if (!cfg) return
      pendingStarts.current.add(id)
      const ctx = ensureCtx()
      let buf: AudioBuffer
      try {
        buf = await getBuffer(cfg)
      } catch {
        pendingStarts.current.delete(id)
        setTracks((p) => ({ ...p, [id]: { ...p[id], active: false, unavailable: true } }))
        return
      }
      // stopTrack cancelou este start enquanto o áudio carregava → aborta
      if (!pendingStarts.current.delete(id)) return
      if (activeNodes.current.has(id)) return
      const vol = stateRef.current[id]?.volume ?? 0.5

      if (cfg.category === "music") {
        // Música: repete com crossfade (sobreposição), sem corte abrupto
        const trackGain = ctx.createGain()
        trackGain.gain.value = vol
        trackGain.connect(masterRef.current!)
        const ctrl: Controller = { kind: "music", gain: trackGain, timer: null, stopped: false, sources: new Set() }

        const playSegment = () => {
          if (ctrl.stopped) return
          const src = ctx.createBufferSource()
          src.buffer = buf
          const seg = ctx.createGain()
          src.connect(seg)
          seg.connect(trackGain)
          const t0 = ctx.currentTime
          const dur = buf.duration
          const cf = Math.min(CROSSFADE, dur / 2)
          seg.gain.setValueAtTime(0, t0)
          seg.gain.linearRampToValueAtTime(1, t0 + cf)
          const fadeStart = t0 + Math.max(cf, dur - cf)
          seg.gain.setValueAtTime(1, fadeStart)
          seg.gain.linearRampToValueAtTime(0, fadeStart + cf)
          src.start(t0)
          src.stop(fadeStart + cf + 0.1)
          ctrl.sources.add(src)
          src.onended = () => {
            try { src.disconnect() } catch {}
            try { seg.disconnect() } catch {}
            ctrl.sources.delete(src)
          }
          // Próximo segmento começa no início do fade-out → sobreposição = crossfade
          ctrl.timer = setTimeout(playSegment, Math.max(50, (fadeStart - t0) * 1000))
        }

        playSegment()
        activeNodes.current.set(id, ctrl)
      } else {
        // Ambiente/ruído: loop nativo contínuo
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        const gain = ctx.createGain()
        gain.gain.value = 0
        src.connect(gain)
        gain.connect(masterRef.current!)
        src.start()
        gain.gain.setTargetAtTime(vol, ctx.currentTime, FADE / 3)
        activeNodes.current.set(id, { kind: "loop", gain, src })
      }
    },
    [configs, ensureCtx, getBuffer]
  )

  const stopTrack = useCallback((id: string) => {
    pendingStarts.current.delete(id) // cancela start ainda carregando
    const node = activeNodes.current.get(id)
    const ctx = ctxRef.current
    if (!node || !ctx) return
    activeNodes.current.delete(id)
    node.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3)
    if (node.kind === "music") {
      node.stopped = true
      if (node.timer) clearTimeout(node.timer)
    }
    setTimeout(() => {
      if (node.kind === "loop") {
        try { node.src.stop() } catch {}
        try { node.src.disconnect() } catch {}
      } else {
        node.sources.forEach((s) => {
          try { s.stop() } catch {}
          try { s.disconnect() } catch {}
        })
        node.sources.clear()
      }
      try { node.gain.disconnect() } catch {}
    }, FADE * 1000 + 120)
  }, [])

  const toggleTrack = useCallback(
    (id: string) => {
      const cfg = configs.find((c) => c.id === id)
      const next = !stateRef.current[id]?.active
      // Música é exclusiva: ativar uma para as outras músicas ativas
      const exclusiveMusic = next && cfg?.category === "music"
      if (next) {
        if (exclusiveMusic) {
          for (const c of configs) {
            if (c.category === "music" && c.id !== id && stateRef.current[c.id]?.active) stopTrack(c.id)
          }
        }
        startTrack(id)
      } else {
        stopTrack(id)
      }
      setTracks((p) => {
        const np = { ...p, [id]: { ...p[id], active: next, unavailable: false } }
        if (exclusiveMusic) {
          for (const c of configs) {
            if (c.category === "music" && c.id !== id) np[c.id] = { ...np[c.id], active: false }
          }
        }
        return np
      })
    },
    [configs, startTrack, stopTrack]
  )

  const setVolume = useCallback((id: string, v: number) => {
    const node = activeNodes.current.get(id)
    if (node && ctxRef.current) node.gain.gain.setTargetAtTime(v, ctxRef.current.currentTime, 0.05)
    setTracks((p) => ({ ...p, [id]: { ...p[id], volume: v } }))
  }, [])

  const setMasterVolume = useCallback((v: number) => {
    if (masterRef.current && ctxRef.current) masterRef.current.gain.setTargetAtTime(v, ctxRef.current.currentTime, 0.05)
    setMasterVolumeState(v)
  }, [])

  const stopAll = useCallback(() => {
    Array.from(activeNodes.current.keys()).forEach((id) => stopTrack(id))
    setTracks((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, active: false }])))
    setPaused(false)
  }, [stopTrack])

  // Pausa/retoma todo o áudio sem perder o mix (suspende o AudioContext)
  const pauseAll = useCallback(() => {
    const ctx = ctxRef.current
    if (ctx && ctx.state === "running") ctx.suspend()
    setPaused(true)
  }, [])

  const resumeAll = useCallback(() => {
    const ctx = ctxRef.current
    if (ctx && ctx.state === "suspended") ctx.resume()
    setPaused(false)
  }, [])

  // Retoma o mix salvo na primeira interação do usuário (política de autoplay)
  const prime = useCallback(() => {
    Object.entries(stateRef.current).forEach(([id, st]) => {
      if (st.active && !activeNodes.current.has(id)) startTrack(id)
    })
  }, [startTrack])

  // Cleanup
  useEffect(() => {
    return () => {
      activeNodes.current.forEach((n) => {
        if (n.kind === "music") {
          if (n.timer) clearTimeout(n.timer)
          n.sources.forEach((s) => {
            try { s.stop() } catch {}
            try { s.disconnect() } catch {}
          })
        } else {
          try { n.src.stop() } catch {}
          try { n.src.disconnect() } catch {}
        }
        try { n.gain.disconnect() } catch {}
      })
      activeNodes.current.clear()
      const ctx = ctxRef.current
      if (ctx) ctx.close().catch(() => {})
      ctxRef.current = null
      masterRef.current = null
    }
  }, [])

  return { tracks, toggleTrack, setVolume, masterVolume, setMasterVolume, stopAll, pauseAll, resumeAll, paused, prime }
}
