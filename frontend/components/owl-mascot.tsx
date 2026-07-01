"use client"

import { motion } from "framer-motion"

type Status = "idle" | "listening" | "thinking" | "speaking"

const C: Record<Status, { b1: string; b2: string; glow: string }> = {
  idle: { b1: "#818cf8", b2: "#4338ca", glow: "#a5b4fc" },
  listening: { b1: "#818cf8", b2: "#4338ca", glow: "#a5b4fc" },
  thinking: { b1: "#fbbf24", b2: "#b45309", glow: "#fcd34d" },
  speaking: { b1: "#a78bfa", b2: "#6d28d9", glow: "#c4b5fd" },
}

// Coruja — mascote da Neuro IA. Anima conforme o estado:
// ouvindo (tufos atentos, olhos grandes, piscadas), falando (bico abre/fecha),
// pensando (pupilas olhando ao redor).
export function OwlMascot({ status }: { status: Status }) {
  const c = C[status]
  const speaking = status === "speaking"
  const thinking = status === "thinking"
  const perky = status === "listening"

  return (
    <motion.svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id="owl-body" cx="42%" cy="34%" r="78%">
          <stop offset="0%" stopColor={c.b1} />
          <stop offset="100%" stopColor={c.b2} />
        </radialGradient>
      </defs>

      {/* Glow atrás */}
      <motion.ellipse
        cx="100"
        cy="106"
        rx="76"
        ry="78"
        fill={c.glow}
        animate={{ opacity: speaking ? [0.18, 0.4, 0.18] : [0.1, 0.22, 0.1] }}
        transition={{ duration: speaking ? 0.55 : 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(16px)" }}
      />

      {/* Tufos (orelhinhas) */}
      <motion.g
        style={{ transformOrigin: "100px 62px" }}
        animate={{ rotate: perky ? [-5, 5, -5] : [-2, 2, -2] }}
        transition={{ duration: perky ? 1.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M60 56 L72 26 L88 58 Z" fill={c.b2} />
        <path d="M140 56 L128 26 L112 58 Z" fill={c.b2} />
      </motion.g>

      {/* Corpo/cabeça */}
      <ellipse cx="100" cy="110" rx="68" ry="72" fill="url(#owl-body)" />
      <ellipse cx="100" cy="128" rx="42" ry="48" fill="#ffffff" opacity="0.1" />

      {/* Olhos (com piscada) */}
      <motion.g
        style={{ transformOrigin: "100px 94px" }}
        animate={{ scaleY: [1, 1, 0.12, 1, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1], ease: "easeInOut" }}
      >
        <circle cx="75" cy="94" r="28" fill="#ffffff" />
        <circle cx="125" cy="94" r="28" fill="#ffffff" />
        {/* Pupilas (olham ao redor quando pensando) */}
        <motion.g
          animate={thinking ? { x: [-7, 7, -7], y: [-2, 2, -2] } : { x: 0, y: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="75" cy="94" r={perky ? 14 : 12} fill="#1e1b4b" />
          <circle cx="125" cy="94" r={perky ? 14 : 12} fill="#1e1b4b" />
          <circle cx="80" cy="89" r="4.5" fill="#ffffff" />
          <circle cx="130" cy="89" r="4.5" fill="#ffffff" />
        </motion.g>
      </motion.g>

      {/* Bico / boca */}
      {speaking ? (
        <motion.path
          d="M90 110 L110 110 L100 128 Z"
          fill="#f59e0b"
          animate={{ scaleY: [0.35, 1, 0.5, 1, 0.35] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 110px" }}
        />
      ) : (
        <path d="M92 110 L108 110 L100 124 Z" fill="#f59e0b" />
      )}
    </motion.svg>
  )
}
