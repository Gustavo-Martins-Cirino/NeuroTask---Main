# Modelos 3D do Escritório

Personagem sentado (já incluso: `seated-character.fbx`, Mixamo "Seated Idle").
Para trocar, substitua por outro arquivo com o mesmo nome — aceita **.fbx**
(Mixamo) ou **.glb** (Ready Player Me / Sketchfab):

    seated-character.fbx   (ou .glb)

Requisitos do arquivo:
- `.glb` (binário) com **esqueleto rigado**;
- uma animação de sentar em loop, de preferência chamada **`Sitting`**
  (se tiver outro nome, o componente usa o primeiro clip; ou ajuste `CLIP_NAME`
  em `frontend/components/seated-character.tsx`);
- olhando para a frente (o componente já vira o personagem para a mesa).

Fontes gratuitas:
- **Mixamo** (Adobe): escolha um personagem → aba Animations → busque
  "Sitting" / "Seated Idle" → Download **glb** (Skin: With Skin).
- **Ready Player Me**: gera um avatar e baixa o `.glb` (depois aplique uma
  animação de sentar do Mixamo).
- **Sketchfab / Kenney**: modelos CC0 de pessoa sentada.

Ajuste fino de posição/escala no assento: constantes no topo de
`frontend/components/seated-character.tsx` (BASE_POSITION / BASE_SCALE e o
mapa `offsetPorCadeira`). Enquanto o arquivo não existir, a cena usa o
personagem procedural automaticamente (não quebra).
