import { describe, it, expect } from "vitest"
import { feedUrl, newFeedToken } from "./calendar-feed"

describe("feedUrl", () => {
  it("monta a URL com sufixo .ics", () => {
    expect(feedUrl("abc123", "https://neuro-task-main.vercel.app")).toBe(
      "https://neuro-task-main.vercel.app/api/calendar/abc123.ics"
    )
  })

  it("não duplica a barra quando o origin termina em /", () => {
    expect(feedUrl("t", "https://x.com/")).toBe("https://x.com/api/calendar/t.ics")
  })
})

describe("newFeedToken", () => {
  it("gera 32 chars hex", () => {
    expect(newFeedToken()).toMatch(/^[0-9a-f]{32}$/)
  })

  it("dois tokens são diferentes (é segredo, não pode repetir)", () => {
    expect(newFeedToken()).not.toBe(newFeedToken())
  })
})
