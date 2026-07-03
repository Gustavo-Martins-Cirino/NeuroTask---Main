"use client"

import { motion } from "framer-motion"

type Status = "idle" | "listening" | "thinking" | "speaking" | "resting"

const C: Record<Status, { b1: string; b2: string; glow: string; eye: string }> = {
  idle: { b1: "#a5b4fc", b2: "#6366f1", glow: "#818cf8", eye: "#c7d2fe" },
  listening: { b1: "#a5b4fc", b2: "#4f46e5", glow: "#818cf8", eye: "#e0e7ff" },
  thinking: { b1: "#fcd34d", b2: "#d97706", glow: "#fbbf24", eye: "#fde68a" },
  speaking: { b1: "#c4b5fd", b2: "#7c3aed", glow: "#a78bfa", eye: "#ede9fe" },
  resting: { b1: "#94a3b8", b2: "#475569", glow: "#64748b", eye: "#cbd5e1" },
}

const MOUTH_X = [84, 92, 100, 108, 116]

// Mascote da Neuro IA: robozinho animado (antena = sinal de "inteligência").
export function RobotMascot({ status }: { status: Status }) {
  const c = C[status]
  const speaking = status === "speaking"
  const thinking = status === "thinking"
  const resting = status === "resting"
  const listening = status === "listening"

  return (
    <motion.svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      animate={{ y: resting ? [0, -2, 0] : [0, -5, 0] }}
      transition={{ duration: resting ? 4 : 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="robo-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.b1} />
          <stop offset="100%" stopColor={c.b2} />
        </linearGradient>
      </defs>

      {/* Glow */}
      <motion.ellipse
        cx="100"
        cy="104"
        rx="72"
        ry="66"
        fill={c.glow}
        animate={{ opacity: resting ? [0.05, 0.1, 0.05] : speaking ? [0.2, 0.42, 0.2] : thinking ? [0.18, 0.34, 0.18] : [0.1, 0.22, 0.1] }}
        transition={{ duration: speaking ? 0.5 : resting ? 3.5 : 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(20px)" }}
      />

      {/* Antena — luz de inteligência */}
      <line x1="100" y1="48" x2="100" y2="26" stroke={c.b2} strokeWidth="3" strokeLinecap="round" />
      <motion.circle
        cx="100"
        cy="20"
        r="6"
        fill={c.glow}
        style={{ transformOrigin: "100px 20px" }}
        animate={resting ? { opacity: 0.25, scale: 1 } : { opacity: [0.5, 1, 0.5], scale: [1, 1.5, 1] }}
        transition={{ duration: thinking ? 0.6 : 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orelhas */}
      <rect x="36" y="86" width="10" height="30" rx="5" fill={c.b2} />
      <rect x="154" y="86" width="10" height="30" rx="5" fill={c.b2} />

      {/* Cabeça + tela do rosto */}
      <rect x="46" y="48" width="108" height="104" rx="30" fill="url(#robo-head)" />
      <rect x="60" y="64" width="80" height="72" rx="20" fill="#0f172a" opacity="0.85" />

      {/* Olhos (piscam; olham ao redor pensando; fecham descansando) */}
      <motion.g
        style={{ transformOrigin: "100px 96px" }}
        animate={resting ? { scaleY: 0.12 } : { scaleY: [1, 1, 0.15, 1, 1] }}
        transition={resting ? { duration: 0.3 } : { duration: 4.5, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1], ease: "easeInOut" }}
      >
        <motion.g
          animate={thinking ? { x: [-6, 6, -6], y: [-2, 2, -2] } : { x: 0, y: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="83" cy="96" r={listening ? 11 : 9} fill={c.eye} />
          <circle cx="117" cy="96" r={listening ? 11 : 9} fill={c.eye} />
          <circle cx="86" cy="92" r="3" fill="#ffffff" />
          <circle cx="120" cy="92" r="3" fill="#ffffff" />
        </motion.g>
      </motion.g>

      {/* Boca — equalizer que anima ao falar */}
      {MOUTH_X.map((x, i) => (
        <motion.rect
          key={x}
          x={x - 2.5}
          y={110}
          width={5}
          height={14}
          rx={2.5}
          fill={c.eye}
          style={{ transformOrigin: `${x}px 124px` }}
          animate={speaking ? { scaleY: [0.25, 1, 0.5, 0.9, 0.25] } : { scaleY: 0.28 }}
          transition={speaking ? { duration: 0.5, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" } : { duration: 0.2 }}
        />
      ))}

      {/* Zzz ao descansar */}
      {resting && (
        <motion.text
          x="150"
          y="58"
          fontSize="16"
          fontWeight="bold"
          fill={c.glow}
          animate={{ opacity: [0, 1, 0], y: [0, -14, -26] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          z
        </motion.text>
      )}
    </motion.svg>
  )
}
