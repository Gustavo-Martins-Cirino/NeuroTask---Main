"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

// Cena SVG do Escritório — "Escritório vivo":
// v1: micro-animações (gato, plantas, luminária, neon) + ciclo dia/noite real.
// v2: objetos reativos a TRABALHO REAL (anti-farm): você digitando quando há
//     tarefa em andamento, estante que enche com conclusões, quadro de streak,
//     clique nos objetos mostra estatísticas, café de manhã (ambiental).

export interface OfficeSceneStats {
  working: boolean
  completed: number
  streak: number
}

interface OfficeSceneProps {
  equipped: Set<string>
  stats?: OfficeSceneStats // ausente = cena neutra (ex.: escritório de amigo)
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

// Livros da estante: 1 a cada 5 tarefas concluídas (ordem de "chegada")
const BOOKS = [
  { x: 340, y: 76, h: 24, f: "#e57373" },
  { x: 348, y: 80, h: 20, f: "#64b5f6" },
  { x: 356, y: 74, h: 26, f: "#ffd54f" },
  { x: 364, y: 82, h: 18, f: "#81c784" },
  { x: 340, y: 114, h: 22, f: "#9575cd" },
  { x: 348, y: 110, h: 26, f: "#4db6ac" },
  { x: 340, y: 148, h: 24, f: "#f06292" },
  { x: 348, y: 152, h: 20, f: "#7986cb" },
  { x: 356, y: 146, h: 26, f: "#ffb74d" },
]

export function OfficeScene({ equipped, stats, className }: OfficeSceneProps) {
  const has = (id: string) => equipped.has(id)

  // Hora real só no cliente (evita mismatch de hidratação); atualiza a cada minuto
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

  // Gato ronrona ao clique (interação, não recompensa)
  const [purr, setPurr] = useState(0)
  const doPurr = () => {
    setPurr((n) => n + 1)
    setTimeout(() => setPurr((n) => Math.max(0, n - 1)), 1600)
  }

  const working = stats?.working ?? false
  const bookCount = stats ? Math.min(BOOKS.length, Math.floor(stats.completed / 5) + (stats.completed > 0 ? 1 : 0)) : BOOKS.length
  const screenOn = stats ? (working ? 0.9 : 0.55) : 0.85

  return (
    <svg viewBox="0 0 400 260" className={className} role="img" aria-label="Seu escritório">
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
        @media (prefers-reduced-motion: reduce) {
          .nt-cat-body, .nt-cat-tail, .nt-cat-eyes, .nt-plant, .nt-plant-slow, .nt-lamp-glow,
          .nt-neon, .nt-star, .nt-arm-l, .nt-arm-r, .nt-cursor-blink, .nt-steam-p, .nt-head-bob { animation: none; }
        }
      `}</style>

      {/* Parede */}
      <rect x="0" y="0" width="400" height="192" fill={
        has("parede-azul") ? "#b9d2e4" : has("parede-verde") ? "#bfd8c4" : has("parede-rosa") ? "#ecccd8" : "#e3ded4"
      } />
      <rect x="0" y="180" width="400" height="12" fill={
        has("parede-azul") ? "#a5c2d8" : has("parede-verde") ? "#adc9b3" : has("parede-rosa") ? "#e0bac9" : "#d6d0c4"
      } />

      {/* Piso */}
      {has("piso-carpete") ? (
        <g>
          <rect x="0" y="192" width="400" height="68" fill="#9fb3cf" />
          {Array.from({ length: 24 }).map((_, i) => (
            <circle key={i} cx={12 + (i % 8) * 52 + (Math.floor(i / 8) % 2) * 26} cy={206 + Math.floor(i / 8) * 20} r="2" fill="#8ba1c2" />
          ))}
        </g>
      ) : has("piso-madeira") ? (
        <g>
          <rect x="0" y="192" width="400" height="68" fill="#c08a55" />
          {[208, 226, 244].map((y) => (
            <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#a97544" strokeWidth="2" />
          ))}
          {[70, 180, 300, 120, 250, 350].map((x, i) => (
            <line key={i} x1={x} y1={192 + (i % 3) * 18} x2={x} y2={192 + (i % 3) * 18 + 16} stroke="#a97544" strokeWidth="2" />
          ))}
        </g>
      ) : (
        <rect x="0" y="192" width="400" height="68" fill="#cfc7b8" />
      )}

      {/* Janela com vista da cidade — céu segue a hora real */}
      {has("janela-cidade") && (
        <g>
          <rect x="28" y="26" width="92" height="92" rx="6" fill="#8a8378" />
          <rect x="34" y="32" width="80" height="80" rx="3" fill={sky.sky} />
          <rect x="34" y="86" width="80" height="26" fill={sky.horizon} />
          {sky.moon ? (
            <g>
              <circle cx="100" cy="46" r="7" fill="#f4f1de" />
              <circle cx="97" cy="44" r="6" fill={sky.sky} />
              {[[44, 40], [58, 50], [72, 38], [88, 56], [50, 60]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.1" fill="#f4f1de" className="nt-star" style={{ animationDelay: `${i * 0.7}s` }} />
              ))}
            </g>
          ) : (
            <circle cx="102" cy={phase === "day" ? 44 : 62} r="7" fill={sky.sun} />
          )}
          <g fill={sky.building}>
            <rect x="40" y="70" width="12" height="42" />
            <rect x="56" y="58" width="14" height="54" />
            <rect x="74" y="76" width="10" height="36" />
            <rect x="88" y="64" width="16" height="48" />
          </g>
          <g fill="#ffd97a" opacity={sky.lights ? 1 : 0.35}>
            <rect x="59" y="64" width="3" height="3" />
            <rect x="65" y="72" width="3" height="3" />
            <rect x="91" y="70" width="3" height="3" />
            <rect x="97" y="82" width="3" height="3" />
            {sky.lights && (
              <>
                <rect x="43" y="76" width="3" height="3" />
                <rect x="43" y="88" width="3" height="3" />
                <rect x="59" y="84" width="3" height="3" />
                <rect x="77" y="82" width="3" height="3" />
                <rect x="91" y="94" width="3" height="3" />
              </>
            )}
          </g>
          <line x1="74" y1="32" x2="74" y2="112" stroke="#8a8378" strokeWidth="4" />
          <line x1="34" y1="72" x2="114" y2="72" stroke="#8a8378" strokeWidth="4" />
        </g>
      )}

      {/* Quadro de montanhas */}
      {has("quadro-montanhas") && (
        <g>
          <rect x="150" y="34" width="64" height="48" rx="3" fill="#8a6f4e" />
          <rect x="155" y="39" width="54" height="38" fill="#cfe8f5" />
          <polygon points="155,77 172,52 186,77" fill="#7d9b82" />
          <polygon points="176,77 194,46 209,77" fill="#5f7f6a" />
          <polygon points="190,54 194,46 199,54" fill="#f4f7f4" />
          <circle cx="164" cy="47" r="4" fill="#ffe9a8" />
        </g>
      )}

      {/* Neon "focus" com flicker ocasional */}
      {has("quadro-neon") && (
        <g className="nt-neon nt-o">
          <rect x="238" y="40" width="92" height="34" rx="17" fill="none" stroke="#f472b6" strokeWidth="3" />
          <rect x="238" y="40" width="92" height="34" rx="17" fill="#f472b6" opacity="0.13" />
          <text x="284" y="63" textAnchor="middle" fontSize="17" fontWeight="700" fill="#f472b6" fontFamily="monospace" letterSpacing="2">
            focus
          </text>
        </g>
      )}

      {/* Quadro de streak (só com trabalho real acumulado) */}
      {stats && stats.streak >= 2 && (
        <g
          onClick={() => toast.success(`🔥 ${stats.streak} dias seguidos concluindo tarefas — o quadro registra seu ritmo real.`)}
          style={{ cursor: "pointer" }}
        >
          <rect x="124" y="84" width="34" height="24" rx="3" fill="#faf7f0" stroke="#c9c2b4" strokeWidth="2" />
          <text x="141" y="101" textAnchor="middle" fontSize="11" fontWeight="700" fill="#d97706" fontFamily="sans-serif">
            🔥{stats.streak}
          </text>
        </g>
      )}

      {/* Estante de livros — enche com suas conclusões (1 livro a cada 5) */}
      {has("estante") && (
        <g
          onClick={() => {
            if (stats) toast.success(`📚 Sua biblioteca: ${stats.completed} tarefas concluídas — cada ~5 viram um livro novo.`)
          }}
          style={stats ? { cursor: "pointer" } : undefined}
        >
          <rect x="332" y="58" width="56" height="134" rx="3" fill="#8a6f4e" />
          {[70, 106, 142].map((y) => (
            <rect key={y} x="337" y={y} width="46" height="30" fill="#6f5940" />
          ))}
          <g>
            {BOOKS.slice(0, bookCount).map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width="7" height={b.h} fill={b.f} />
            ))}
            {bookCount >= 6 && <rect x="357" y="118" width="16" height="18" fill="#a1887f" />}
          </g>
        </g>
      )}

      {/* Tapete */}
      {has("tapete") && (
        <g>
          <ellipse cx="200" cy="228" rx="120" ry="24" fill="#b76e79" opacity="0.85" />
          <ellipse cx="200" cy="228" rx="96" ry="18" fill="none" stroke="#a35c67" strokeWidth="3" />
        </g>
      )}

      {/* Planta grande (balança de leve) */}
      {has("planta-grande") && (
        <g>
          <g className="nt-plant-slow nt-o">
            <path d="M62 196 q-14 -34 6 -58" fill="none" stroke="#4e7d52" strokeWidth="5" strokeLinecap="round" />
            <path d="M62 196 q4 -40 -18 -52" fill="none" stroke="#4e7d52" strokeWidth="5" strokeLinecap="round" />
            <path d="M62 196 q16 -28 34 -34" fill="none" stroke="#4e7d52" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="66" cy="134" rx="12" ry="20" fill="#5f9a64" transform="rotate(12 66 134)" />
            <ellipse cx="42" cy="142" rx="11" ry="18" fill="#6dab72" transform="rotate(-24 42 142)" />
            <ellipse cx="98" cy="158" rx="11" ry="17" fill="#6dab72" transform="rotate(40 98 158)" />
          </g>
          <path d="M48 196 h30 l-4 26 h-22 z" fill="#c96f4a" />
          <rect x="46" y="192" width="34" height="8" rx="3" fill="#b55f3d" />
        </g>
      )}

      {/* Luminária de chão (brilho pulsante; mais forte à noite) */}
      {has("luminaria") && (
        <g>
          <circle
            cx="318"
            cy="118"
            r={isNight ? 32 : 26}
            fill="#ffe9a8"
            className="nt-lamp-glow"
            style={{ ["--glow" as string]: isNight ? 0.6 : 0.4 }}
          />
          <path d="M304 106 h28 l-6 16 h-16 z" fill="#e0a437" />
          <line x1="318" y1="122" x2="318" y2="208" stroke="#7a7267" strokeWidth="4" />
          <rect x="304" y="206" width="28" height="7" rx="3.5" fill="#7a7267" />
        </g>
      )}

      {/* Você — sentado na cadeira; digita quando há tarefa em andamento */}
      <g className={working ? undefined : "nt-head-bob nt-o"}>
        <rect x="188" y="106" width="24" height="30" rx="9" fill="#3f6f8f" />
        <circle cx="200" cy="97" r="9.5" fill="#e0a97e" />
        <path d="M190.5 97 a9.5 9.5 0 0 1 19 0 l0 -2 q-2 -8 -9.5 -8 t-9.5 8 z" fill="#4a3a2c" />
      </g>

      {/* Cadeira (atrás da mesa) */}
      {has("cadeira-gamer") ? (
        <g>
          <path d="M182 96 q18 -12 36 0 l-3 46 h-30 z" fill="#c62839" opacity="0.92" />
          <rect x="186" y="104" width="28" height="30" rx="8" fill="#8e1c2a" opacity="0.9" />
          <rect x="184" y="140" width="32" height="12" rx="5" fill="#c62839" />
          <line x1="200" y1="152" x2="200" y2="170" stroke="#3a3a3a" strokeWidth="5" />
          <path d="M182 172 h36" stroke="#3a3a3a" strokeWidth="5" strokeLinecap="round" />
        </g>
      ) : has("cadeira-ergonomica") ? (
        <g>
          <rect x="184" y="100" width="32" height="40" rx="10" fill="#4a5568" opacity="0.92" />
          <rect x="188" y="108" width="24" height="24" rx="6" fill="#5d6b80" opacity="0.9" />
          <rect x="183" y="142" width="34" height="10" rx="5" fill="#4a5568" />
          <line x1="200" y1="152" x2="200" y2="170" stroke="#3a3a3a" strokeWidth="4" />
          <path d="M184 172 h32" stroke="#3a3a3a" strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <rect x="186" y="116" width="28" height="26" rx="6" fill="#9a8f7f" opacity="0.85" />
          <line x1="192" y1="142" x2="190" y2="168" stroke="#7a7267" strokeWidth="4" />
          <line x1="208" y1="142" x2="210" y2="168" stroke="#7a7267" strokeWidth="4" />
        </g>
      )}

      {/* Braços digitando (só com trabalho de verdade rolando) */}
      {working && (
        <g>
          <g className="nt-arm-l nt-o">
            <line x1="190" y1="122" x2="177" y2="142" stroke="#e0a97e" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="nt-arm-r nt-o">
            <line x1="210" y1="122" x2="223" y2="142" stroke="#e0a97e" strokeWidth="5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* Mesa */}
      <g>
        <rect x="112" y="146" width="176" height="10" rx="4" fill="#8a6f4e" />
        <rect x="120" y="156" width="8" height="50" fill="#75593c" />
        <rect x="272" y="156" width="8" height="50" fill="#75593c" />
      </g>

      {/* Setup em cima da mesa — tela acesa e código passando quando trabalhando */}
      {has("setup-ultrawide") ? (
        <g>
          <path d="M142 112 q58 -10 116 0 l-2 26 q-56 8 -112 0 z" fill="#1f2530" />
          <path d="M148 117 q52 -8 104 0 l-1.5 17 q-50 6 -101 0 z" fill="#3b82f6" opacity={screenOn} />
          {working && (
            <g>
              <rect x="168" y="120" width="24" height="2" rx="1" fill="#e2e8f0" opacity="0.85" />
              <rect x="168" y="125" width="36" height="2" rx="1" fill="#bfdbfe" opacity="0.8" />
              <rect x="168" y="130" width="16" height="2" rx="1" fill="#e2e8f0" opacity="0.7" />
              <rect x="186" y="129.5" width="4" height="3" fill="#fff" className="nt-cursor-blink" />
            </g>
          )}
          <rect x="194" y="138" width="12" height="8" fill="#3a3f4a" />
          <rect x="182" y="145" width="36" height="4" rx="2" fill="#3a3f4a" />
        </g>
      ) : has("setup-duplo") ? (
        <g>
          <rect x="138" y="110" width="58" height="34" rx="3" fill="#1f2530" />
          <rect x="142" y="114" width="50" height="26" fill="#3b82f6" opacity={screenOn} />
          <rect x="204" y="110" width="58" height="34" rx="3" fill="#1f2530" />
          <rect x="208" y="114" width="50" height="26" fill="#60a5fa" opacity={screenOn} />
          {working && (
            <g>
              <rect x="146" y="119" width="22" height="2" rx="1" fill="#e2e8f0" opacity="0.85" />
              <rect x="146" y="124" width="32" height="2" rx="1" fill="#bfdbfe" opacity="0.8" />
              <rect x="146" y="129" width="14" height="2" rx="1" fill="#e2e8f0" opacity="0.7" />
              <rect x="162" y="128.5" width="4" height="3" fill="#fff" className="nt-cursor-blink" />
            </g>
          )}
          <rect x="162" y="144" width="10" height="4" fill="#3a3f4a" />
          <rect x="228" y="144" width="10" height="4" fill="#3a3f4a" />
        </g>
      ) : (
        <g>
          <rect x="172" y="112" width="56" height="30" rx="3" fill="#1f2530" />
          <rect x="176" y="116" width="48" height="22" fill="#3b82f6" opacity={screenOn} />
          {working && (
            <g>
              <rect x="180" y="120" width="20" height="2" rx="1" fill="#e2e8f0" opacity="0.85" />
              <rect x="180" y="125" width="30" height="2" rx="1" fill="#bfdbfe" opacity="0.8" />
              <rect x="180" y="130" width="14" height="2" rx="1" fill="#e2e8f0" opacity="0.7" />
              <rect x="196" y="129.5" width="4" height="3" fill="#fff" className="nt-cursor-blink" />
            </g>
          )}
          <rect x="196" y="142" width="8" height="4" fill="#3a3f4a" />
        </g>
      )}

      {/* Café da manhã (5h–12h) com vapor — detalhe ambiental */}
      {isMorning && (
        <g>
          <path d="M118 138 h12 v8 a6 6 0 0 1 -12 0 z" fill="#fdfaf4" />
          <path d="M131 139 q5 1.5 0 5" fill="none" stroke="#fdfaf4" strokeWidth="2" />
          <path d="M121 134 q-1.5 -3 0 -5" fill="none" stroke="#cfc7b8" strokeWidth="1.6" strokeLinecap="round" className="nt-steam-p nt-o" />
          <path d="M126 134 q1.5 -3 0 -5" fill="none" stroke="#cfc7b8" strokeWidth="1.6" strokeLinecap="round" className="nt-steam-p nt-o" style={{ animationDelay: "1.2s" }} />
        </g>
      )}

      {/* Itens de mesa */}
      {has("planta-pequena") && (
        <g>
          <g className="nt-plant nt-o">
            <path d="M136 132 q-6 -10 2 -16 M136 132 q6 -9 -1 -17 M136 132 q8 -5 12 -12" fill="none" stroke="#5f9a64" strokeWidth="3" strokeLinecap="round" />
          </g>
          <path d="M129 132 h14 l-2 12 h-10 z" fill="#c96f4a" />
        </g>
      )}
      {has("trofeu") && (
        <g
          onClick={() => {
            if (stats) toast.success(`🏆 ${stats.completed} tarefas concluídas até aqui. O troféu é disso — trabalho real acumulado.`)
          }}
          style={stats ? { cursor: "pointer" } : undefined}
        >
          <path d="M252 118 h20 v8 a10 10 0 0 1 -20 0 z" fill="#f2c744" />
          <path d="M250 120 q-7 2 -2 9 M274 120 q7 2 2 9" fill="none" stroke="#f2c744" strokeWidth="3" />
          <rect x="259" y="134" width="6" height="6" fill="#d9a92e" />
          <rect x="254" y="140" width="16" height="5" rx="2" fill="#b8901f" />
        </g>
      )}

      {/* Gato — respira, pisca, abana o rabo; clique = ronrona */}
      {has("pet-gato") && (
        <g onClick={doPurr} style={{ cursor: "pointer" }}>
          <path d="M293 234 q-12 -4 -8 -16" fill="none" stroke="#4a4a55" strokeWidth="5" strokeLinecap="round" className="nt-cat-tail nt-o" />
          <g className="nt-cat-body nt-o">
            <ellipse cx="312" cy="234" rx="20" ry="11" fill="#4a4a55" />
            <circle cx="330" cy="226" r="9" fill="#4a4a55" />
            <polygon points="324,220 327,212 330,219" fill="#4a4a55" />
            <polygon points="331,219 335,211 338,219" fill="#4a4a55" />
            <g className="nt-cat-eyes nt-o">
              <circle cx="328" cy="225" r="1.4" fill="#ffe9a8" />
              <circle cx="334" cy="225" r="1.4" fill="#ffe9a8" />
            </g>
          </g>
          {purr > 0 && (
            <g key={purr}>
              <path d="M330 208 c-2 -3 -6 -1 -4 2 l4 3 4 -3 c2 -3 -2 -5 -4 -2 z" fill="#f06292" className="nt-heart-up nt-o" />
              <path d="M340 212 c-1.5 -2.5 -5 -1 -3.5 1.5 l3.5 2.5 3.5 -2.5 c1.5 -2.5 -2 -4 -3.5 -1.5 z" fill="#f48fb1" className="nt-heart-up nt-o" style={{ animationDelay: "0.25s" }} />
            </g>
          )}
        </g>
      )}

      {/* Ambiente escurece suavemente à noite / entardecer */}
      {(isNight || phase === "dusk") && (
        <rect x="0" y="0" width="400" height="260" fill="#16213e" opacity={isNight ? 0.15 : 0.07} pointerEvents="none" />
      )}
    </svg>
  )
}
