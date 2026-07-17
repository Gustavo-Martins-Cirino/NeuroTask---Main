import { type AvatarConfig } from "@/lib/avatar"

// Bonequinho 2D (paper-doll) sentado DE COSTAS (¾ traseiro), olhando para
// a mesa/monitores da cena isométrica (direção frente = cima-esquerda na
// tela). Sem rosto — vemos cabelo, costas e as pernas indo PARA FRENTE.
// Origem local = quadril, sobre o assento. Usado na cena e no editor.

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) - amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) - amt))
  const b = Math.max(0, Math.min(255, (n & 255) - amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export function AvatarFigure({ config, working = false }: { config: AvatarConfig; working?: boolean }) {
  const { body, skin, hairStyle, hairColor, outfit, outfitColor, headphones } = config
  const fem = body === "f"
  const pants = outfit === "terno" ? darken(outfitColor, 18) : "#3b5378"
  const sleeve = outfit === "camiseta" ? skin : outfitColor
  const hx = 1 // centro da cabeça (x)
  const hy = fem ? -39 : -40
  const shoulderY = fem ? -26 : -27
  const torsoW = fem ? 20 : 24
  const torsoX = fem ? -9 : -11

  return (
    <g>
      {/* pernas — para FRENTE (direção da mesa: cima-esquerda no iso) */}
      <g>
        {/* sombras de contato dos pés */}
        <ellipse cx="-22.5" cy="12" rx="7" ry="2.6" fill="#000" opacity="0.12" />
        <ellipse cx="-17.5" cy="17" rx="7.5" ry="2.8" fill="#000" opacity="0.12" />
        {/* perna distante */}
        <polyline
          points="-2,-4 -19,-4 -21,9"
          fill="none"
          stroke={darken(pants, 16)}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse cx="-22.5" cy="10" rx="5" ry="3" fill="#26262e" />
        {/* perna próxima */}
        <polyline
          points="3,-1 -14,1 -16,14"
          fill="none"
          stroke={pants}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse cx="-17.5" cy="15" rx="5.5" ry="3.2" fill="#2c2c33" />
      </g>

      {/* braços (de costas: cotovelos abertos indo para a mesa) */}
      {working ? (
        <g>
          <g className="nt-arm-l nt-o">
            <line x1={torsoX + 1} y1={shoulderY} x2="-23" y2="-31" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
            <circle cx="-24" cy="-31.5" r="2.6" fill={skin} />
          </g>
          <g className="nt-arm-r nt-o">
            <line x1={torsoX + torsoW - 1} y1={shoulderY} x2="1" y2="-34" stroke={darken(sleeve, 12)} strokeWidth="5" strokeLinecap="round" />
            <circle cx="0" cy="-34.5" r="2.6" fill={darken(skin, 10)} />
          </g>
        </g>
      ) : (
        <g>
          <line x1={torsoX} y1={shoulderY} x2={torsoX - 3} y2="-9" stroke={sleeve} strokeWidth="5" strokeLinecap="round" />
          <line x1={torsoX + torsoW} y1={shoulderY} x2={torsoX + torsoW + 3} y2="-9" stroke={darken(sleeve, 12)} strokeWidth="5" strokeLinecap="round" />
          <circle cx={torsoX - 3.5} cy="-7.5" r="2.4" fill={skin} />
          <circle cx={torsoX + torsoW + 3.5} cy="-7.5" r="2.4" fill={darken(skin, 10)} />
        </g>
      )}

      {/* tronco de costas */}
      <path
        d={
          fem
            ? `M ${torsoX} -28 q 0 -5 5 -5 h 10 q 5 0 5 5 l 1.5 20 q 0.5 9 -6 9 h -11 q -6.5 0 -6 -9 z`
            : `M ${torsoX} -28 q 0 -5 5 -5 h 14 q 5 0 5 5 l 0.5 21 q 0 8 -6 8 h -13 q -6 0 -6 -8 z`
        }
        fill={outfitColor}
      />
      {outfit === "moletom" && (
        <path d={`M ${hx - 7} -32 q 8 6 16 0 l -1.5 9 q -6.5 4 -13 0 z`} fill={darken(outfitColor, 20)} />
      )}
      {outfit === "jaqueta" && (
        <g>
          <line x1={hx + 1} y1="-31" x2={hx + 1} y2="-2" stroke={darken(outfitColor, 26)} strokeWidth="2" />
          <line x1={torsoX + 1.5} y1="-24" x2={torsoX + 3.5} y2="-2" stroke={darken(outfitColor, 18)} strokeWidth="1.6" />
          <line x1={torsoX + torsoW - 1.5} y1="-24" x2={torsoX + torsoW - 3.5} y2="-2" stroke={darken(outfitColor, 18)} strokeWidth="1.6" />
        </g>
      )}
      {outfit === "terno" && (
        <g>
          <line x1={hx + 1} y1="-12" x2={hx + 1} y2="-1" stroke={darken(outfitColor, 26)} strokeWidth="1.8" />
          <path d={`M ${hx - 5} -31 l 2 3 h 7 l 2 -3`} fill="none" stroke="#f4f1ea" strokeWidth="2.4" />
        </g>
      )}

      {/* pescoço + cabeça de costas (sem rosto) */}
      <rect x={hx - 3} y={hy + 7} width="6" height="5" fill={darken(skin, 8)} />
      <circle cx={hx} cy={hy} r="10" fill={darken(skin, 4)} />

      {/* cabelo (silhuetas de costas) */}
      {hairStyle === "raspado" && <circle cx={hx} cy={hy - 0.5} r="9" fill={hairColor} opacity="0.92" />}
      {hairStyle === "curto" && (
        <path d={`M ${hx - 10} ${hy + 3} a 10 10 0 1 1 20 0 q -2 3.5 -10 3.5 t -10 -3.5 z`} fill={hairColor} />
      )}
      {hairStyle === "franja" && (
        <g fill={hairColor}>
          <path d={`M ${hx - 10} ${hy + 3} a 10 10 0 1 1 20 0 q -2 3.5 -10 3.5 t -10 -3.5 z`} />
          <path d={`M ${hx - 10.5} ${hy + 1} q -1.5 4 0.5 7 q 1.5 -3.5 0.5 -7 z`} />
          <path d={`M ${hx + 10.5} ${hy + 1} q 1.5 4 -0.5 7 q -1.5 -3.5 -0.5 -7 z`} />
        </g>
      )}
      {hairStyle === "cacheado" && (
        <g fill={hairColor}>
          <circle cx={hx - 6} cy={hy - 5} r="5.5" />
          <circle cx={hx + 1} cy={hy - 8} r="6" />
          <circle cx={hx + 7} cy={hy - 4} r="5.5" />
          <circle cx={hx - 8} cy={hy + 2} r="4.5" />
          <circle cx={hx + 9} cy={hy + 2} r="4.5" />
          <circle cx={hx} cy={hy} r="8" />
        </g>
      )}
      {hairStyle === "longo" && (
        <g fill={hairColor}>
          <path d={`M ${hx - 10} ${hy + 3} a 10 10 0 1 1 20 0 q -2 3.5 -10 3.5 t -10 -3.5 z`} />
          <path d={`M ${hx - 7} ${hy + 4} q -2 14 1 22 q 6 3 12 0 q 3 -8 1 -22 q -7 4 -14 0 z`} />
        </g>
      )}
      {hairStyle === "coque" && (
        <g fill={hairColor}>
          <path d={`M ${hx - 10} ${hy + 3} a 10 10 0 1 1 20 0 q -2 3.5 -10 3.5 t -10 -3.5 z`} />
          <circle cx={hx} cy={hy - 11} r="4.5" />
        </g>
      )}

      {/* fones (de costas: arco + as duas conchas) */}
      {headphones && (
        <g>
          <path d={`M ${hx - 10} ${hy - 2} a 10 10 0 0 1 20 0`} fill="none" stroke="#2f2f38" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx={hx - 10} cy={hy + 2} rx="3" ry="4.4" fill="#2f2f38" />
          <ellipse cx={hx + 10} cy={hy + 2} rx="3" ry="4.4" fill="#2f2f38" />
        </g>
      )}
    </g>
  )
}
