import { describe, expect, it } from "vitest"
import { PARAMETROS_DO_EMBED, embedDoYoutube, idsDoYoutube } from "./youtube-embed"

const ID = "jfKfPfyJRdk"
const so = (id: string) => `https://www.youtube.com/embed/${id}?${PARAMETROS_DO_EMBED}`

describe("embedDoYoutube: os formatos que a gente cola", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s`],
    [`youtube.com/watch?v=${ID}`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://music.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc123`],
    [`https://www.youtube.com/live/${ID}?feature=share`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [ID],
    [`  ${ID}  `],
  ])("%s", (link) => {
    expect(embedDoYoutube(link)).toBe(so(ID))
  })

  it("playlist sozinha e vídeo dentro de playlist", () => {
    expect(embedDoYoutube("https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG")).toBe(
      `https://www.youtube.com/embed/videoseries?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG&${PARAMETROS_DO_EMBED}`
    )
    expect(embedDoYoutube(`https://www.youtube.com/watch?v=${ID}&list=PLabc_-123`)).toBe(
      `https://www.youtube.com/embed/${ID}?list=PLabc_-123&${PARAMETROS_DO_EMBED}`
    )
  })
})

describe("embedDoYoutube: o que não pode virar src de iframe", () => {
  it("host parecido não é o YouTube (o alerta do CodeQL)", () => {
    for (const link of [
      `https://evilyoutube.com/watch?v=${ID}`,
      `https://youtube.com.evil.com/watch?v=${ID}`,
      `https://notyoutu.be/${ID}`,
      `https://evil.com/youtube.com/watch?v=${ID}`,
    ]) {
      expect(embedDoYoutube(link), link).toBeNull()
    }
  })

  it("esquema que não é web não passa", () => {
    expect(embedDoYoutube("javascript:alert(1)")).toBeNull()
    expect(embedDoYoutube(`data:text/html,<script>alert(1)</script>`)).toBeNull()
  })

  it("id ou lista com caractere estranho é descartado, não repassado", () => {
    expect(embedDoYoutube(`https://www.youtube.com/watch?v=${ID}"><script>`)).toBeNull()
    expect(embedDoYoutube("https://www.youtube.com/watch?v=curto")).toBeNull()
    expect(embedDoYoutube(`https://www.youtube.com/watch?v=${ID}&list=abc%26autoplay%3D0%23x`)).toBe(so(ID))
  })

  it("sempre sai em www.youtube.com/embed", () => {
    const src = embedDoYoutube(`https://music.youtube.com/watch?v=${ID}`)
    expect(new URL(src as string).origin + new URL(src as string).pathname).toBe(`https://www.youtube.com/embed/${ID}`)
  })

  it("texto vazio ou qualquer coisa", () => {
    for (const lixo of ["", "   ", "olá mundo", "https://www.youtube.com/", "https://www.youtube.com/@canal"]) {
      expect(embedDoYoutube(lixo), lixo).toBeNull()
    }
  })
})

describe("idsDoYoutube: o que a API do player recebe", () => {
  it("vídeo, lista, e os dois juntos", () => {
    expect(idsDoYoutube(`https://youtu.be/${ID}`)).toEqual({ video: ID, lista: null })
    expect(idsDoYoutube("https://www.youtube.com/playlist?list=PLabc_-123")).toEqual({ video: null, lista: "PLabc_-123" })
    expect(idsDoYoutube(`https://www.youtube.com/watch?v=${ID}&list=PLabc_-123`)).toEqual({ video: ID, lista: "PLabc_-123" })
  })

  it("o que não é do YouTube, ou não tem nada para tocar, é null", () => {
    for (const ruim of ["", "javascript:alert(1)", `https://evilyoutube.com/watch?v=${ID}`, "https://www.youtube.com/@canal"]) {
      expect(idsDoYoutube(ruim), ruim).toBeNull()
    }
  })
})
