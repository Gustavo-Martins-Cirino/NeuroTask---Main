// Toon shading (cell-shading) compartilhado — dá a vibe "desenho animado" ao
// Escritório 3D. Converte MeshStandardMaterial em MeshToonMaterial preservando
// cor/textura/emissive, usando um gradiente de 3 tons (bandas nítidas) para o
// sombreamento chapado clássico de cartoon. Funciona em malhas com skinning
// (personagem) — o MeshToonMaterial suporta skinning nativamente.

import {
  BackSide,
  Color,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type Material,
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

// Contorno de tinta (cartoon ink) por inverted hull: para cada malha, um clone
// de face traseira (BackSide) empurrado ao longo da normal por uma largura FIXA
// em espaço-objeto — assim o traço tem espessura uniforme entre objetos grandes
// e pequenos (escalar proporcional deixaria o contorno grosso nos grandes e
// invisível nos pequenos). O objeto da frente cobre o miolo; sobra só a borda.
function outlineMaterial(color: Color, width: number): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({ color, side: BackSide })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.outlineW = { value: width }
    shader.vertexShader =
      "uniform float outlineW;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  transformed += normalize(normal) * outlineW;"
      )
  }
  return mat
}

// Adiciona contornos a todas as malhas de `root`, pulando as que `skip` recusa
// (ex.: casca da sala — piso/paredes não levam traço). Idempotente por nome.
export function addOutlines(
  root: Object3D,
  opts: { color?: string; width?: number; skip?: (name: string) => boolean } = {}
) {
  const color = new Color(opts.color ?? "#2a2320")
  const width = opts.width ?? 0.018
  const alvos: Mesh[] = []
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !m.geometry) return
    if (m.name.endsWith("_contorno")) return
    if (opts.skip?.(m.name)) return
    alvos.push(m)
  })
  for (const m of alvos) {
    const outline = new Mesh(m.geometry, outlineMaterial(color, width))
    outline.name = m.name + "_contorno"
    outline.position.copy(m.position)
    outline.rotation.copy(m.rotation)
    outline.scale.copy(m.scale)
    outline.renderOrder = -1
    ;(m.parent ?? root).add(outline)
  }
}
