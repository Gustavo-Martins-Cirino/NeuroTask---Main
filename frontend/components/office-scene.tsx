// Cena SVG do Escritório (loja cosmética). Ilustração flat com camadas
// condicionais por item equipado — paleta fixa (independe do tema, como
// uma ilustração dentro do card).

interface OfficeSceneProps {
  equipped: Set<string>
  className?: string
}

export function OfficeScene({ equipped, className }: OfficeSceneProps) {
  const has = (id: string) => equipped.has(id)

  const wall = has("parede-azul")
    ? "#b9d2e4"
    : has("parede-verde")
      ? "#bfd8c4"
      : has("parede-rosa")
        ? "#ecccd8"
        : "#e3ded4"
  const wallShade = has("parede-azul")
    ? "#a5c2d8"
    : has("parede-verde")
      ? "#adc9b3"
      : has("parede-rosa")
        ? "#e0bac9"
        : "#d6d0c4"

  return (
    <svg viewBox="0 0 400 260" className={className} role="img" aria-label="Seu escritório">
      {/* Parede */}
      <rect x="0" y="0" width="400" height="192" fill={wall} />
      <rect x="0" y="180" width="400" height="12" fill={wallShade} />

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

      {/* Janela com vista da cidade */}
      {has("janela-cidade") && (
        <g>
          <rect x="28" y="26" width="92" height="92" rx="6" fill="#8a8378" />
          <rect x="34" y="32" width="80" height="80" rx="3" fill="#aee0f2" />
          <rect x="34" y="86" width="80" height="26" fill="#7fb5d6" />
          <g fill="#5f7f9c">
            <rect x="40" y="70" width="12" height="42" />
            <rect x="56" y="58" width="14" height="54" />
            <rect x="74" y="76" width="10" height="36" />
            <rect x="88" y="64" width="16" height="48" />
          </g>
          <g fill="#ffe9a8">
            <rect x="59" y="64" width="3" height="3" />
            <rect x="65" y="72" width="3" height="3" />
            <rect x="91" y="70" width="3" height="3" />
            <rect x="97" y="82" width="3" height="3" />
          </g>
          <circle cx="102" cy="44" r="7" fill="#fff3c4" />
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

      {/* Neon "focus" */}
      {has("quadro-neon") && (
        <g>
          <rect x="238" y="40" width="92" height="34" rx="17" fill="none" stroke="#f472b6" strokeWidth="3" opacity="0.9" />
          <rect x="238" y="40" width="92" height="34" rx="17" fill="#f472b6" opacity="0.12" />
          <text x="284" y="63" textAnchor="middle" fontSize="17" fontWeight="700" fill="#f472b6" fontFamily="monospace" letterSpacing="2">
            focus
          </text>
        </g>
      )}

      {/* Estante de livros */}
      {has("estante") && (
        <g>
          <rect x="332" y="58" width="56" height="134" rx="3" fill="#8a6f4e" />
          {[70, 106, 142].map((y) => (
            <rect key={y} x="337" y={y} width="46" height="30" fill="#6f5940" />
          ))}
          <g>
            <rect x="340" y="76" width="7" height="24" fill="#e57373" />
            <rect x="348" y="80" width="7" height="20" fill="#64b5f6" />
            <rect x="356" y="74" width="7" height="26" fill="#ffd54f" />
            <rect x="364" y="82" width="7" height="18" fill="#81c784" />
            <rect x="340" y="114" width="7" height="22" fill="#9575cd" />
            <rect x="348" y="110" width="7" height="26" fill="#4db6ac" />
            <rect x="357" y="118" width="16" height="18" fill="#a1887f" />
            <rect x="340" y="148" width="7" height="24" fill="#f06292" />
            <rect x="348" y="152" width="7" height="20" fill="#7986cb" />
            <rect x="356" y="146" width="7" height="26" fill="#ffb74d" />
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

      {/* Planta grande */}
      {has("planta-grande") && (
        <g>
          <path d="M62 196 q-14 -34 6 -58" fill="none" stroke="#4e7d52" strokeWidth="5" strokeLinecap="round" />
          <path d="M62 196 q4 -40 -18 -52" fill="none" stroke="#4e7d52" strokeWidth="5" strokeLinecap="round" />
          <path d="M62 196 q16 -28 34 -34" fill="none" stroke="#4e7d52" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="66" cy="134" rx="12" ry="20" fill="#5f9a64" transform="rotate(12 66 134)" />
          <ellipse cx="42" cy="142" rx="11" ry="18" fill="#6dab72" transform="rotate(-24 42 142)" />
          <ellipse cx="98" cy="158" rx="11" ry="17" fill="#6dab72" transform="rotate(40 98 158)" />
          <path d="M48 196 h30 l-4 26 h-22 z" fill="#c96f4a" />
          <rect x="46" y="192" width="34" height="8" rx="3" fill="#b55f3d" />
        </g>
      )}

      {/* Luminária de chão */}
      {has("luminaria") && (
        <g>
          <circle cx="318" cy="118" r="26" fill="#ffe9a8" opacity="0.45" />
          <path d="M304 106 h28 l-6 16 h-16 z" fill="#e0a437" />
          <line x1="318" y1="122" x2="318" y2="208" stroke="#7a7267" strokeWidth="4" />
          <rect x="304" y="206" width="28" height="7" rx="3.5" fill="#7a7267" />
        </g>
      )}

      {/* Cadeira (atrás da mesa) */}
      {has("cadeira-gamer") ? (
        <g>
          <path d="M182 96 q18 -12 36 0 l-3 46 h-30 z" fill="#c62839" />
          <rect x="186" y="104" width="28" height="30" rx="8" fill="#8e1c2a" />
          <rect x="184" y="140" width="32" height="12" rx="5" fill="#c62839" />
          <line x1="200" y1="152" x2="200" y2="170" stroke="#3a3a3a" strokeWidth="5" />
          <path d="M182 172 h36" stroke="#3a3a3a" strokeWidth="5" strokeLinecap="round" />
        </g>
      ) : has("cadeira-ergonomica") ? (
        <g>
          <rect x="184" y="100" width="32" height="40" rx="10" fill="#4a5568" />
          <rect x="188" y="108" width="24" height="24" rx="6" fill="#5d6b80" />
          <rect x="183" y="142" width="34" height="10" rx="5" fill="#4a5568" />
          <line x1="200" y1="152" x2="200" y2="170" stroke="#3a3a3a" strokeWidth="4" />
          <path d="M184 172 h32" stroke="#3a3a3a" strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <rect x="186" y="116" width="28" height="26" rx="6" fill="#9a8f7f" />
          <line x1="192" y1="142" x2="190" y2="168" stroke="#7a7267" strokeWidth="4" />
          <line x1="208" y1="142" x2="210" y2="168" stroke="#7a7267" strokeWidth="4" />
        </g>
      )}

      {/* Mesa */}
      <g>
        <rect x="112" y="146" width="176" height="10" rx="4" fill="#8a6f4e" />
        <rect x="120" y="156" width="8" height="50" fill="#75593c" />
        <rect x="272" y="156" width="8" height="50" fill="#75593c" />
      </g>

      {/* Setup em cima da mesa */}
      {has("setup-ultrawide") ? (
        <g>
          <path d="M142 112 q58 -10 116 0 l-2 26 q-56 8 -112 0 z" fill="#1f2530" />
          <path d="M148 117 q52 -8 104 0 l-1.5 17 q-50 6 -101 0 z" fill="#3b82f6" opacity="0.85" />
          <rect x="194" y="138" width="12" height="8" fill="#3a3f4a" />
          <rect x="182" y="145" width="36" height="4" rx="2" fill="#3a3f4a" />
        </g>
      ) : has("setup-duplo") ? (
        <g>
          <rect x="138" y="110" width="58" height="34" rx="3" fill="#1f2530" />
          <rect x="142" y="114" width="50" height="26" fill="#3b82f6" opacity="0.85" />
          <rect x="204" y="110" width="58" height="34" rx="3" fill="#1f2530" />
          <rect x="208" y="114" width="50" height="26" fill="#60a5fa" opacity="0.85" />
          <rect x="162" y="144" width="10" height="4" fill="#3a3f4a" />
          <rect x="228" y="144" width="10" height="4" fill="#3a3f4a" />
        </g>
      ) : (
        <g>
          <rect x="172" y="112" width="56" height="30" rx="3" fill="#1f2530" />
          <rect x="176" y="116" width="48" height="22" fill="#3b82f6" opacity="0.85" />
          <rect x="196" y="142" width="8" height="4" fill="#3a3f4a" />
        </g>
      )}

      {/* Itens de mesa */}
      {has("planta-pequena") && (
        <g>
          <path d="M136 132 q-6 -10 2 -16 M136 132 q6 -9 -1 -17 M136 132 q8 -5 12 -12" fill="none" stroke="#5f9a64" strokeWidth="3" strokeLinecap="round" />
          <path d="M129 132 h14 l-2 12 h-10 z" fill="#c96f4a" />
        </g>
      )}
      {has("trofeu") && (
        <g>
          <path d="M252 118 h20 v8 a10 10 0 0 1 -20 0 z" fill="#f2c744" />
          <path d="M250 120 q-7 2 -2 9 M274 120 q7 2 2 9" fill="none" stroke="#f2c744" strokeWidth="3" />
          <rect x="259" y="134" width="6" height="6" fill="#d9a92e" />
          <rect x="254" y="140" width="16" height="5" rx="2" fill="#b8901f" />
        </g>
      )}

      {/* Gato */}
      {has("pet-gato") && (
        <g>
          <ellipse cx="312" cy="234" rx="20" ry="11" fill="#4a4a55" />
          <circle cx="330" cy="226" r="9" fill="#4a4a55" />
          <polygon points="324,220 327,212 330,219" fill="#4a4a55" />
          <polygon points="331,219 335,211 338,219" fill="#4a4a55" />
          <path d="M293 234 q-12 -4 -8 -16" fill="none" stroke="#4a4a55" strokeWidth="5" strokeLinecap="round" />
          <circle cx="328" cy="225" r="1.4" fill="#ffe9a8" />
          <circle cx="334" cy="225" r="1.4" fill="#ffe9a8" />
        </g>
      )}
    </svg>
  )
}
