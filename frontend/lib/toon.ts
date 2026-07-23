// Toon shading (cell-shading) compartilhado — dá a vibe "desenho animado" ao
// Escritório 3D. Converte MeshStandardMaterial em MeshToonMaterial preservando
// cor/textura/emissive, usando um gradiente de 3 tons (bandas nítidas) para o
// sombreamento chapado clássico de cartoon. Funciona em malhas com skinning
// (personagem) — o MeshToonMaterial suporta skinning nativamente.

import {
  Color,
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three"

// 3 degraus de luz (sombra / meio / cheio) amostrados por N·L.
export const TOON_GRADIENT = new DataTexture(new Uint8Array([80, 160, 255]), 3, 1, RedFormat)
TOON_GRADIENT.minFilter = TOON_GRADIENT.magFilter = NearestFilter
TOON_GRADIENT.needsUpdate = true

export function toToon(mat: Material): MeshToonMaterial {
  const s = mat as MeshStandardMaterial
  const t = new MeshToonMaterial({
    color: s.color ? s.color.clone() : new Color(0xffffff),
    gradientMap: TOON_GRADIENT,
  })
  if (s.map) t.map = s.map
  if (s.emissive) {
    t.emissive = s.emissive.clone()
    t.emissiveIntensity = s.emissiveIntensity ?? 1
    if (s.emissiveMap) t.emissiveMap = s.emissiveMap
  }
  if (s.transparent) {
    t.transparent = true
    t.opacity = s.opacity
  }
  t.side = s.side
  return t
}

// Troca in-place todos os materiais de um objeto por versões toon.
export function toonifyObject(root: Object3D) {
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !m.material) return
    m.material = Array.isArray(m.material) ? m.material.map(toToon) : toToon(m.material)
  })
}
