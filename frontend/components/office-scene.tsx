"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AvatarFigure } from "@/components/avatar-figure"
import { DEFAULT_AVATAR, normalizeAvatar, type AvatarConfig } from "@/lib/avatar"

// Cena SVG do Escritório — visão ISOMÉTRICA 2.5D ("Escritório vivo"):
// duas paredes + chão em losango, móveis com profundidade (projeção 2:1),
// micro-animações, ciclo dia/noite real e objetos reativos a TRABALHO REAL
// (anti-farm): pessoa digitando com tarefa em andamento, estante que enche
// com conclusões, quadro de streak, café de manhã.

export interface OfficeSceneStats {
  working: boolean
  completed: number
  streak: number
}

interface OfficeSceneProps {
  equipped: Set<string>
  stats?: OfficeSceneStats // ausente = cena neutra (ex.: escritório de amigo)
  avatar?: AvatarConfig | null
  onAvatarClick?: () => void // clicar no bonequinho (ex.: abrir o editor)
  className?: string
}

type DayPhase = "dawn" | "day" | "dusk" | "night"

function phaseOf(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return "dawn"
  if (hour >= 8 && hour < 17) return "day"
  if (hour >= 17 && hour < 19) return "dusk"
  return "night"
}

const SKY: Record<DayPhase, { sky: string; horizon: string; building: string; sun?: string; moon?: boolean; lights: boolean }> = {
  dawn: { sky: "#f6c99f", horizon: "#e89a6f", building: "#6b6f8a", sun: "#ffd97a", lights: false },
  day: { sky: "#aee0f2", horizon: "#7fb5d6", building: "#5f7f9c", sun: "#fff3c4", lights: false },
  dusk: { sky: "#f2a06a", horizon: "#c96f5a", building: "#4c5170", sun: "#ff9d4d", lights: true },
  night: { sky: "#1c2b4a", horizon: "#14203a", building: "#2e3f57", moon: true, lights: true },
}

// Fundo da ilustração (atrás da sala) por fase — nada de void escuro
const BG: Record<DayPhase, [string, string]> = {
  dawn: ["#fbe3c9", "#f6efe2"],
  day: ["#dfeefa", "#f2f8fd"],
  dusk: ["#f2c1a0", "#e8d7d2"],
  night: ["#232c4d", "#3a476e"],
}

// ---- Projeção isométrica 2:1 ----
// x cresce ao longo da parede DIREITA; y ao longo da ESQUERDA; z para cima.
const OX = 240
const OY = 150
const WALL_H = 108
const FLOOR = 170

type P3 = [number, number, number]
const sx = (x: number, y: number) => OX + x - y
const sy = (x: number, y: number, z: number) => OY + (x + y) / 2 - z
const p = (v: P3) => `${sx(v[0], v[1])},${sy(v[0], v[1], v[2])}`
const quad = (a: P3, b: P3, c: P3, d: P3) => [a, b, c, d].map(p).join(" ")

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt))
  const b = Math.max(0, Math.min(255, (n & 255) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

// Caixa isométrica: 3 faces visíveis (topo, esquerda-frente +y, direita-frente +x)
function Box({ x, y, z = 0, dx, dy, dz, c }: { x: number; y: number; z?: number; dx: number; dy: number; dz: number; c: string }) {
  return (
    <g>
      <polygon points={quad([x, y + dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x, y + dy, z + dz])} fill={shade(c, -8)} />
      <polygon points={quad([x + dx, y, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x + dx, y, z + dz])} fill={shade(c, -26)} />
      <polygon points={quad([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz])} fill={shade(c, 10)} />
    </g>
  )
}

// Planos das paredes: coordenadas locais com y descendo A PARTIR DO TOPO da
// parede (ydown = WALL_H - z), o que mantém rects/desenho 2D intuitivos.
// Parede esquerda espelha horizontalmente (a=-1) — texto lá precisa de scale(-1,1).
const LEFT_WALL_T = `matrix(-1,0.5,0,1,${OX},${OY - WALL_H})`
const RIGHT_WALL_T = `matrix(1,0.5,0,1,${OX},${OY - WALL_H})`
// plano vertical paralelo à parede esquerda, em x=c (telas de monitor)
const planeX = (c: number) => `matrix(-1,0.5,0,1,${OX + c},${OY + c / 2 - WALL_H})`
// plano vertical paralelo à parede direita, em y=c (frente da estante)
const planeY = (c: number) => `matrix(1,0.5,0,1,${OX - c},${OY + c / 2 - WALL_H})`

// Sombra elíptica no chão (preto semitransparente suave)
function Shadow({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return <ellipse cx={sx(x, y)} cy={sy(x, y, 0)} rx={rx} ry={ry} fill="rgba(0,0,0,0.13)" />
}

// Livros da estante: 1 a cada 5 tarefas concluídas (coordenadas locais do
// plano da frente da estante; y desce do topo da parede)
const BOOKS = [
  { x: 110, y: 22, h: 20, f: "#e57373" },
  { x: 118, y: 26, h: 16, f: "#64b5f6" },
  { x: 126, y: 20, h: 22, f: "#ffd54f" },
  { x: 134, y: 26, h: 16, f: "#81c784" },
  { x: 110, y: 52, h: 18, f: "#9575cd" },
  { x: 118, y: 50, h: 20, f: "#4db6ac" },
  { x: 110, y: 84, h: 20, f: "#f06292" },
  { x: 118, y: 88, h: 16, f: "#7986cb" },
  { x: 126, y: 82, h: 22, f: "#ffb74d" },
]

export function OfficeScene({ equipped, stats, avatar, onAvatarClick, className }: OfficeSceneProps) {
  const has = (id: string) => equipped.has(id)
  const person = avatar ? normalizeAvatar(avatar) : DEFAULT_AVATAR

  const [hour, setHour] = useState(12)
  useEffect(() => {
    const tick = () => setHour(new Date().getHours())
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [])
  const phase = phaseOf(hour)
  const sky = SKY[phase]
  const isNight = phase === "night"
  const isMorning = hour >= 5 && hour < 12

  const [purr, setPurr] = useState(0)
  const doPurr = () => {
    setPurr((n) => n + 1)
    setTimeout(() => setPurr((n) => Math.max(0, n - 1)), 1600)
  }

  const working = stats?.working ?? false
  const bookCount = stats ? Math.min(BOOKS.length, Math.floor(stats.completed / 5) + (stats.completed > 0 ? 1 : 0)) : BOOKS.length
  const screenOn = stats ? (working ? 0.92 : 0.5) : 0.85

  const wallBase = has("parede-azul") ? "#a9c6dc" : has("parede-verde") ? "#afccb6" : has("parede-rosa") ? "#e2bccb" : "#d8d2c6"
  const floorBase = has("piso-carpete") ? "#9fb3cf" : has("piso-madeira") ? "#c08a55" : "#cfc7b8"

  const chairColor = has("cadeira-gamer") ? "#c62839" : has("cadeira-ergonomica") ? "#4a5568" : "#9a8f7f"
  const chairBack = has("cadeira-gamer") ? 46 : has("cadeira-ergonomica") ? 36 : 22

  return (
    <svg viewBox="0 0 480 340" className={className} role="img" aria-label="Seu escritório">
      <style>{`
        .nt-o { transform-box: fill-box; }
        @keyframes nt-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.015, 1.05); } }
        @keyframes nt-tail { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(10deg); } }
        @keyframes nt-blink { 0%, 94%, 100% { transform: scaleY(1); } 96%, 98% { transform: scaleY(0.08); } }
        @keyframes nt-sway { 0%, 100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
        @keyframes nt-glow { 0%, 100% { opacity: var(--glow, 0.45); } 50% { opacity: calc(var(--glow, 0.45) + 0.14); } }
        @keyframes nt-flicker { 0%, 88%, 100% { opacity: 0.9; } 89% { opacity: 0.35; } 90% { opacity: 0.9; } 93% { opacity: 0.55; } 94% { opacity: 0.9; } }
        @keyframes nt-twinkle { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.25; } }
        @keyframes nt-heart { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.95; } 100% { transform: translateY(-22px); opacity: 0; } }
        @keyframes nt-type { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1.6px); } }
        @keyframes nt-cursor { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes nt-steam { 0% { transform: translateY(0); opacity: 0; } 30% { opacity: 0.5; } 100% { transform: translateY(-8px); opacity: 0; } }
        @keyframes nt-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.2px); } }
        .nt-cat-body { animation: nt-breathe 3.2s ease-in-out infinite; transform-origin: 50% 100%; }
        .nt-cat-tail { animation: nt-tail 3.8s ease-in-out infinite; transform-origin: 100% 100%; }
        .nt-cat-eyes { animation: nt-blink 5.5s linear infinite; transform-origin: 50% 50%; }
        .nt-plant { animation: nt-sway 5s ease-in-out infinite; transform-origin: 50% 100%; }
        .nt-plant-slow { animation: nt-sway 6.5s ease-in-out infinite; transform-origin: 50% 100%; }
        .nt-lamp-glow { animation: nt-glow 4s ease-in-out infinite; }
        .nt-neon { animation: nt-flicker 7s linear infinite; }
        .nt-star { animation: nt-twinkle 3s ease-in-out infinite; }
        .nt-heart-up { animation: nt-heart 1.5s ease-out forwards; }
        .nt-arm-l { animation: nt-type 0.36s ease-in-out infinite; }
        .nt-arm-r { animation: nt-type 0.36s ease-in-out infinite; animation-delay: 0.18s; }
        .nt-cursor-blink { animation: nt-cursor 0.9s steps(1) infinite; }
        .nt-steam-p { animation: nt-steam 2.4s ease-out infinite; }
        .nt-head-bob { animation: nt-bob 2.6s ease-in-out infinite; }
      `}</style>

      {/* ---- Fundo (ambiente atrás da sala, segue a fase do dia) ---- */}
      <defs>
        <linearGradient id="nt-scene-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BG[phase][0]} />
          <stop offset="1" stopColor={BG[phase][1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="340" fill="url(#nt-scene-bg)" />
      <ellipse cx="240" cy="298" rx="215" ry="36" fill="#000" opacity="0.10" />

      {/* ---- Paredes ---- */}
      <polygon points={quad([0, 0, WALL_H], [0, FLOOR, WALL_H], [0, FLOOR, 0], [0, 0, 0])} fill={wallBase} />
      <polygon points={quad([0, 0, WALL_H], [FLOOR, 0, WALL_H], [FLOOR, 0, 0], [0, 0, 0])} fill={shade(wallBase, -18)} />
      {/* rodapé */}
      <polygon points={quad([0, 0, 9], [0, FLOOR, 9], [0, FLOOR, 0], [0, 0, 0])} fill={shade(wallBase, -12)} />
      <polygon points={quad([0, 0, 9], [FLOOR, 0, 9], [FLOOR, 0, 0], [0, 0, 0])} fill={shade(wallBase, -30)} />
      {/* borda superior das paredes (acabamento) */}
      <polyline
        points={`${p([0, FLOOR, WALL_H])} ${p([0, 0, WALL_H])} ${p([FLOOR, 0, WALL_H])}`}
        fill="none"
        stroke="#f2eee6"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ---- Chão ---- */}
      <polygon points={quad([0, 0, 0], [FLOOR, 0, 0], [FLOOR, FLOOR, 0], [0, FLOOR, 0])} fill={floorBase} />
      {has("piso-madeira") && (
        <g stroke={shade(floorBase, -22)} strokeWidth="2">
          {[34, 68, 102, 136].map((k) => (
            <line key={k} x1={sx(k, 0)} y1={sy(k, 0, 0)} x2={sx(k, FLOOR)} y2={sy(k, FLOOR, 0)} />
          ))}
        </g>
      )}
      {has("piso-carpete") && (
        <g fill={shade(floorBase, -20)}>
          {[[40, 40], [90, 30], [140, 45], [50, 95], [100, 80], [150, 100], [40, 140], [95, 130], [145, 150]].map(([x, y], i) => (
            <ellipse key={i} cx={sx(x, y)} cy={sy(x, y, 0)} rx="2.4" ry="1.2" />
          ))}
        </g>
      )}

      {/* ---- Parede esquerda: janela + quadro de streak ---- */}
      <g transform={LEFT_WALL_T}>
        {has("janela-cidade") && (
          <g>
            <rect x="30" y="12" width="70" height="62" rx="4" fill="#8a8378" />
            <rect x="34" y="16" width="62" height="54" rx="2" fill={sky.sky} />
            <rect x="34" y="54" width="62" height="16" fill={sky.horizon} />
            <g fill={sky.building}>
              <rect x="38" y="44" width="10" height="26" />
              <rect x="51" y="36" width="12" height="34" />
              <rect x="66" y="48" width="9" height="22" />
              <rect x="78" y="40" width="13" height="30" />
            </g>
            <g fill="#ffd97a" opacity={sky.lights ? 1 : 0.35}>
              <rect x="53" y="40" width="3" height="3" />
              <rect x="58" y="48" width="3" height="3" />
              <rect x="81" y="45" width="3" height="3" />
              <rect x="86" y="54" width="3" height="3" />
              {sky.lights && (
                <>
                  <rect x="40" y="50" width="3" height="3" />
                  <rect x="40" y="60" width="3" height="3" />
                  <rect x="68" y="54" width="3" height="3" />
                  <rect x="81" y="62" width="3" height="3" />
                </>
              )}
            </g>
            {sky.moon ? (
              <g>
                <circle cx="86" cy="24" r="5.5" fill="#f4f1de" />
                <circle cx="83.5" cy="22.5" r="4.6" fill={sky.sky} />
                {[[42, 22], [54, 26], [66, 20], [74, 28]].map(([x, y], i) => (
                  <rect key={i} x={x} y={y} width="1.8" height="1.8" fill="#f4f1de" className="nt-star" style={{ animationDelay: `${i * 0.7}s` }} />
                ))}
              </g>
            ) : (
              <circle cx="86" cy={phase === "day" ? 24 : 36} r="5.5" fill={sky.sun} />
            )}
            <line x1="65" y1="16" x2="65" y2="70" stroke="#8a8378" strokeWidth="3.5" />
            <line x1="34" y1="44" x2="96" y2="44" stroke="#8a8378" strokeWidth="3.5" />
          </g>
        )}
        {/* quadro de streak (texto desespelhado: parede esquerda tem a=-1) */}
        {stats && stats.streak >= 2 && (
          <g
            onClick={() => toast.success(`🔥 ${stats.streak} dias seguidos concluindo tarefas — o quadro registra seu ritmo real.`)}
            style={{ cursor: "pointer" }}
          >
            <rect x="108" y="40" width="36" height="22" rx="3" fill="#faf7f0" stroke="#c9c2b4" strokeWidth="2" />
            <g transform="translate(126,51) scale(-1,1)">
              <text textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#d97706" fontFamily="sans-serif">
                🔥{stats.streak}
              </text>
            </g>
          </g>
        )}
      </g>

      {/* ---- Parede direita: quadro + neon ---- */}
      <g transform={RIGHT_WALL_T}>
        {has("quadro-montanhas") && (
          <g>
            <rect x="10" y="16" width="46" height="36" rx="3" fill="#8a6f4e" />
            <rect x="14" y="20" width="38" height="28" fill="#cfe8f5" />
            <polygon points="14,48 25,32 34,48" fill="#7d9b82" />
            <polygon points="26,48 38,27 50,48" fill="#5f7f6a" />
            <polygon points="35,32 38,27 41,32" fill="#f4f7f4" />
            <circle cx="21" cy="26" r="3" fill="#ffe9a8" />
          </g>
        )}
        {has("quadro-neon") && (
          <g className="nt-neon nt-o">
            <rect x="12" y="60" width="46" height="22" rx="11" fill="none" stroke="#f472b6" strokeWidth="2.4" />
            <rect x="12" y="60" width="46" height="22" rx="11" fill="#f472b6" opacity="0.13" />
            <text x="35" y="74.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#f472b6" fontFamily="monospace" letterSpacing="1">
              focus
            </text>
          </g>
        )}
      </g>

      {/* ---- Estante (parede direita) ---- */}
      {has("estante") && (
        <g
          onClick={() => {
            if (stats) toast.success(`📚 Sua biblioteca: ${stats.completed} tarefas concluídas — cada ~5 viram um livro novo.`)
          }}
          style={stats ? { cursor: "pointer" } : undefined}
        >
          <Shadow x={132} y={30} rx={44} ry={13} />
          <Box x={104} y={6} dx={54} dy={24} dz={92} c="#8a6f4e" />
          {/* frente aberta com prateleiras e livros */}
          <g transform={planeY(30)}>
            <rect x={107} y={20} width={48} height={84} fill="#6f5940" />
            <rect x={107} y={42} width={48} height={4} fill="#8a6f4e" />
            <rect x={107} y={70} width={48} height={4} fill="#8a6f4e" />
            {BOOKS.slice(0, bookCount).map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width="6" height={b.h} fill={b.f} />
            ))}
            {bookCount >= 6 && <rect x={130} y={58} width={14} height={12} fill="#a1887f" />}
          </g>
        </g>
      )}

      {/* ---- Tapete ---- */}
      {has("tapete") && (
        <g>
          <ellipse cx={sx(100, 112)} cy={sy(100, 112, 0)} rx="86" ry="34" fill="#b76e79" opacity="0.85" />
          <ellipse cx={sx(100, 112)} cy={sy(100, 112, 0)} rx="66" ry="25" fill="none" stroke="#a35c67" strokeWidth="3" />
        </g>
      )}

      {/* ---- Mesa (encostada na parede esquerda) + setup ---- */}
      <Shadow x={28} y={80} rx={62} ry={20} />
      <Box x={6} y={26} dx={40} dy={104} z={30} dz={7} c="#8a6f4e" />
      <Box x={10} y={32} dx={32} dy={24} dz={30} c="#75593c" />
      <Box x={10} y={102} dx={32} dy={24} dz={30} c="#75593c" />
      {/* bandeja de madeira sob o teclado (conecta à mesa em L; nada de
          sombra elíptica solta) + teclado apoiado nela */}
      <Box x={24} y={63} dx={17} dy={42} z={37} dz={1.5} c="#947958" />
      <Box x={28} y={69} dx={10} dy={31} z={38.5} dz={2.5} c="#3a3f4a" />

      {/* monitores (tela virada para a câmera) */}
      {has("setup-ultrawide") ? (
        <g>
          <Box x={14} y={64} dx={4} dy={10} z={37} dz={6} c="#3a3f4a" />
          <Box x={12} y={44} dx={6} dy={72} z={43} dz={26} c="#1f2530" />
          <g transform={planeX(18)}>
            <rect x={48} y={41} width={64} height={22} fill="#3b82f6" opacity={screenOn} />
            {working && (
              <g>
                <rect x={52} y={45} width={20} height={2} rx={1} fill="#e2e8f0" opacity="0.85" />
                <rect x={52} y={50} width={30} height={2} rx={1} fill="#bfdbfe" opacity="0.8" />
                <rect x={52} y={55} width={12} height={2} rx={1} fill="#e2e8f0" opacity="0.7" />
                <rect x={66} y={54.5} width={3.5} height={3} fill="#fff" className="nt-cursor-blink" />
              </g>
            )}
          </g>
        </g>
      ) : has("setup-duplo") ? (
        <g>
          <Box x={14} y={52} dx={4} dy={8} z={37} dz={5} c="#3a3f4a" />
          <Box x={14} y={94} dx={4} dy={8} z={37} dz={5} c="#3a3f4a" />
          <Box x={12} y={44} dx={6} dy={32} z={42} dz={23} c="#1f2530" />
          <Box x={12} y={82} dx={6} dy={32} z={42} dz={23} c="#1f2530" />
          <g transform={planeX(18)}>
            <rect x={46} y={45} width={28} height={19} fill="#3b82f6" opacity={screenOn} />
            <rect x={84} y={45} width={28} height={19} fill="#60a5fa" opacity={screenOn} />
            {working && (
              <g>
                <rect x={48} y={48} width={16} height={2} rx={1} fill="#e2e8f0" opacity="0.85" />
                <rect x={48} y={53} width={22} height={2} rx={1} fill="#bfdbfe" opacity="0.8" />
                <rect x={48} y={58} width={10} height={2} rx={1} fill="#e2e8f0" opacity="0.7" />
                <rect x={60} y={57.5} width={3.5} height={3} fill="#fff" className="nt-cursor-blink" />
              </g>
            )}
          </g>
        </g>
      ) : (
        <g>
          <Box x={14} y={72} dx={4} dy={8} z={37} dz={5} c="#3a3f4a" />
          <Box x={12} y={58} dx={6} dy={38} z={42} dz={24} c="#1f2530" />
          <g transform={planeX(18)}>
            <rect x={60} y={44} width={34} height={20} fill="#3b82f6" opacity={screenOn} />
            {working && (
              <g>
                <rect x={63} y={47} width={18} height={2} rx={1} fill="#e2e8f0" opacity="0.85" />
                <rect x={63} y={52} width={26} height={2} rx={1} fill="#bfdbfe" opacity="0.8" />
                <rect x={63} y={57} width={11} height={2} rx={1} fill="#e2e8f0" opacity="0.7" />
                <rect x={76} y={56.5} width={3.5} height={3} fill="#fff" className="nt-cursor-blink" />
              </g>
            )}
          </g>
        </g>
      )}

      {/* itens da mesa */}
      {has("planta-pequena") && (
        <g transform={`translate(${sx(24, 118)},${sy(24, 118, 37)})`}>
          <g className="nt-plant nt-o">
            <path d="M0 0 q-5 -8 1 -13 M0 0 q5 -7 -1 -14 M0 0 q7 -4 10 -10" fill="none" stroke="#5f9a64" strokeWidth="2.6" strokeLinecap="round" />
          </g>
          <path d="M-6 0 h12 l-2 10 h-8 z" fill="#c96f4a" />
        </g>
      )}
      {has("trofeu") && (
        <g
          transform={`translate(${sx(24, 40)},${sy(24, 40, 37)})`}
          onClick={() => {
            if (stats) toast.success(`🏆 ${stats.completed} tarefas concluídas até aqui. O troféu é disso — trabalho real acumulado.`)
          }}
          style={stats ? { cursor: "pointer" } : undefined}
        >
          <path d="M-8 -18 h16 v6 a8 8 0 0 1 -16 0 z" fill="#f2c744" />
          <path d="M-10 -16 q-5 1.5 -1.5 7 M10 -16 q5 1.5 1.5 7" fill="none" stroke="#f2c744" strokeWidth="2.4" />
          <rect x={-2.5} y={-5} width="5" height="5" fill="#d9a92e" />
          <rect x={-6.5} y={0} width="13" height="4" rx="2" fill="#b8901f" />
        </g>
      )}
      {isMorning && (
        <g transform={`translate(${sx(38, 52)},${sy(38, 52, 37)})`}>
          <path d="M-5 -8 h10 v6 a5 5 0 0 1 -10 0 z" fill="#fdfaf4" />
          <path d="M6 -7 q4 1.5 0 4.5" fill="none" stroke="#fdfaf4" strokeWidth="1.8" />
          <path d="M-2.5 -11 q-1.2 -2.6 0 -4.4" fill="none" stroke="#e8e2d4" strokeWidth="1.4" strokeLinecap="round" className="nt-steam-p nt-o" />
          <path d="M1.5 -11 q1.2 -2.6 0 -4.4" fill="none" stroke="#e8e2d4" strokeWidth="1.4" strokeLinecap="round" className="nt-steam-p nt-o" style={{ animationDelay: "1.2s" }} />
        </g>
      )}

      {/* ---- Cadeira + você ---- */}
      <Shadow x={76} y={84} rx={20} ry={8} />
      {/* base (peça da cadeira — mais clara para não ler como sombra dura) */}
      <ellipse cx={sx(76, 84)} cy={sy(76, 84, 0)} rx="12" ry="5.5" fill="#4a4a52" />
      <Box x={74} y={82} dx={4} dy={4} z={4} dz={14} c="#4a4a4a" />
      {/* assento — almofada na altura do QUADRIL (espia ao lado do tronco),
          não até os pés: se ela chegar na altura dos pés vira uma bandeja
          onde ele "fica em pé em cima" em vez de estar sentado dentro dela */}
      <Box x={62} y={70} dx={20} dy={20} z={22} dz={3} c={chairColor} />
      {/* coluna curta ligando a almofada à base giratória, sem "degrau" */}
      <Box x={72} y={80} dx={8} dy={8} z={18} dz={4} c={shade(chairColor, -10)} />
      {/* você — avatar editável, sentado de lado (pernas incluídas!)
          O grupo externo POSICIONA (attr transform) e o interno ANIMA (CSS
          transform) — juntos, o CSS sobrescreveria a posição e o avatar
          sumiria para a origem do SVG. */}
      <g
        transform={`translate(${sx(74, 84)},${sy(74, 84, 25)})`}
        onClick={onAvatarClick}
        style={onAvatarClick ? { cursor: "pointer" } : undefined}
      >
        <g className={working ? undefined : "nt-head-bob nt-o"}>
          <AvatarFigure config={person} working={working} />
        </g>
      </g>
      {/* encosto (na frente do tronco para dar profundidade) */}
      {chairBack > 0 && <Box x={88} y={70} dx={6} dy={28} z={22} dz={chairBack} c={chairColor} />}

      {/* ---- Planta grande (frente-esquerda, dentro do losango do chão) ---- */}
      {has("planta-grande") && (
        <g transform={`translate(${sx(52, 142)},${sy(52, 142, 0)})`}>
          <ellipse cx="0" cy="4" rx="22" ry="8" fill="rgba(0,0,0,0.13)" />
          <g className="nt-plant-slow nt-o">
            <path d="M0 -4 q-12 -30 5 -52" fill="none" stroke="#4e7d52" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M0 -4 q3 -36 -16 -46" fill="none" stroke="#4e7d52" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M0 -4 q14 -25 30 -30" fill="none" stroke="#4e7d52" strokeWidth="4.5" strokeLinecap="round" />
            <ellipse cx="4" cy="-56" rx="11" ry="18" fill="#5f9a64" transform="rotate(12 4 -56)" />
            <ellipse cx="-17" cy="-48" rx="10" ry="16" fill="#6dab72" transform="rotate(-24 -17 -48)" />
            <ellipse cx="32" cy="-32" rx="10" ry="15" fill="#6dab72" transform="rotate(40 32 -32)" />
          </g>
          <path d="M-13 -4 h26 l-3.5 23 h-19 z" fill="#c96f4a" />
          <ellipse cx="0" cy="-4" rx="14" ry="5.5" fill="#b55f3d" />
        </g>
      )}

      {/* ---- Luminária (frente-direita) ---- */}
      {has("luminaria") && (
        <g transform={`translate(${sx(148, 64)},${sy(148, 64, 0)})`}>
          <ellipse cx="0" cy="0" rx="15" ry="5.5" fill="rgba(0,0,0,0.13)" />
          <circle cx="0" cy="-86" r={isNight ? 26 : 21} fill="#ffe9a8" className="nt-lamp-glow" style={{ ["--glow" as string]: isNight ? 0.6 : 0.4 }} />
          <path d="M-12 -94 h24 l-5 13 h-14 z" fill="#e0a437" />
          <line x1="0" y1="-81" x2="0" y2="-4" stroke="#7a7267" strokeWidth="3.5" />
          <ellipse cx="0" cy="-3" rx="12" ry="4.5" fill="#7a7267" />
        </g>
      )}

      {/* ---- Gato ---- */}
      {has("pet-gato") && (
        <g onClick={doPurr} style={{ cursor: "pointer" }} transform={`translate(${sx(120, 132)},${sy(120, 132, 0)})`}>
          <ellipse cx="0" cy="2" rx="20" ry="7.5" fill="rgba(0,0,0,0.13)" />
          <path d="M-19 -2 q-11 -4 -7 -15" fill="none" stroke="#4a4a55" strokeWidth="4.5" strokeLinecap="round" className="nt-cat-tail nt-o" />
          <g className="nt-cat-body nt-o">
            <ellipse cx="0" cy="-4" rx="18" ry="10" fill="#4a4a55" />
            <circle cx="16" cy="-11" r="8" fill="#4a4a55" />
            <polygon points="11,-16 13.5,-24 16,-17" fill="#4a4a55" />
            <polygon points="17,-17 20.5,-24.5 23,-17" fill="#4a4a55" />
            <g className="nt-cat-eyes nt-o">
              <circle cx="14" cy="-11.5" r="1.3" fill="#ffe9a8" />
              <circle cx="19.5" cy="-11.5" r="1.3" fill="#ffe9a8" />
            </g>
          </g>
          {purr > 0 && (
            <g key={purr}>
              <path d="M16 -30 c-2 -3 -6 -1 -4 2 l4 3 4 -3 c2 -3 -2 -5 -4 -2 z" fill="#f06292" className="nt-heart-up nt-o" />
              <path d="M26 -26 c-1.5 -2.5 -5 -1 -3.5 1.5 l3.5 2.5 3.5 -2.5 c1.5 -2.5 -2 -4 -3.5 -1.5 z" fill="#f48fb1" className="nt-heart-up nt-o" style={{ animationDelay: "0.25s" }} />
            </g>
          )}
        </g>
      )}

      {/* ---- Ambiente escurece à noite / entardecer ---- */}
      {(isNight || phase === "dusk") && (
        <rect x="0" y="0" width="480" height="340" fill="#16213e" opacity={isNight ? 0.15 : 0.07} pointerEvents="none" />
      )}
    </svg>
  )
}
