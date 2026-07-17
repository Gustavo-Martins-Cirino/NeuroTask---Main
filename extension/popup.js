const API_BASE = "https://neuro-task-main.vercel.app"

const unpairedEl = document.getElementById("unpaired")
const pairedEl = document.getElementById("paired")
const codeEl = document.getElementById("code")
const pairBtn = document.getElementById("pair")
const unpairBtn = document.getElementById("unpair")
const statusEl = document.getElementById("status")

async function render() {
  const { token } = await chrome.storage.local.get("token")
  unpairedEl.style.display = token ? "none" : "block"
  pairedEl.style.display = token ? "block" : "none"
}

pairBtn.addEventListener("click", async () => {
  const code = codeEl.value.trim()
  if (code.length !== 6) {
    statusEl.textContent = "Digite os 6 dígitos do código."
    return
  }
  pairBtn.disabled = true
  statusEl.textContent = ""
  try {
    const res = await fetch(`${API_BASE}/api/extension/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    if (!res.ok) {
      statusEl.textContent = "Código inválido ou expirado. Gere um novo em Configurações."
      pairBtn.disabled = false
      return
    }
    const { token } = await res.json()
    await chrome.storage.local.set({ token, buffer: {} })
    await render()
  } catch {
    statusEl.textContent = "Falha de conexão. Tente de novo."
  }
  pairBtn.disabled = false
})

unpairBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "buffer"])
  await render()
})

render()
