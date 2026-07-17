const API_BASE = "https://neuro-task-main.vercel.app"
const TRACKED_DOMAINS = [
  "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "facebook.com", "reddit.com", "youtube.com", "threads.net",
]
const TICK_SECONDS = 60

function matchDomain(hostname) {
  return TRACKED_DOMAINS.find((d) => hostname === d || hostname.endsWith("." + d)) ?? null
}

function localDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function getBuffer() {
  const { buffer } = await chrome.storage.local.get("buffer")
  return buffer || {}
}

async function addToBuffer(domain, seconds) {
  const buffer = await getBuffer()
  const key = `${domain}|${localDateKey()}`
  buffer[key] = (buffer[key] || 0) + seconds
  await chrome.storage.local.set({ buffer })
}

async function getToken() {
  const { token } = await chrome.storage.local.get("token")
  return token || null
}

async function flush() {
  const token = await getToken()
  if (!token) return
  const buffer = await getBuffer()
  const keys = Object.keys(buffer)
  if (keys.length === 0) return

  const entries = keys.map((key) => {
    const [domain, date] = key.split("|")
    return { domain, date, seconds: buffer[key] }
  })

  try {
    const res = await fetch(`${API_BASE}/api/extension/screen-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entries }),
    })
    if (res.ok) await chrome.storage.local.set({ buffer: {} })
  } catch {
    // mantém o buffer pra tentar de novo no próximo tick (rede intermitente)
  }
}

async function tick() {
  try {
    const idleState = await chrome.idle.queryState(15)
    if (idleState !== "active") return

    const windows = await chrome.windows.getAll({ populate: false })
    const focused = windows.find((w) => w.focused)
    if (!focused) return

    const [tab] = await chrome.tabs.query({ active: true, windowId: focused.id })
    if (!tab?.url) return

    let hostname
    try {
      hostname = new URL(tab.url).hostname
    } catch {
      return
    }

    const domain = matchDomain(hostname)
    if (!domain) return

    await addToBuffer(domain, TICK_SECONDS)
  } catch {
    // ignora falhas pontuais (aba fechada no meio da checagem, etc.)
  } finally {
    await flush()
  }
}

chrome.alarms.create("tick", { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tick") tick()
})
