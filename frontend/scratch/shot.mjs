import puppeteer from "puppeteer-core"
import { resolve } from "path"

const alvo = process.argv[2] ?? "sg"
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: "new",
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=swiftshader",
    "--use-angle=swiftshader",
    "--disable-gpu",
    "--no-sandbox",
    "--allow-file-access-from-files",
  ],
})
const page = await browser.newPage()
page.on("pageerror", (e) => console.log("[erro]", e.message))
page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text()) })
await page.setViewport({ width: 940, height: 560, deviceScaleFactor: 1 })
await page.goto("file:///" + resolve(`scratch/${alvo}.html`).replace(/\\/g, "/"), { waitUntil: "load", timeout: 60000 })
await new Promise((r) => setTimeout(r, 4000))
await page.screenshot({ path: `scratch/${alvo}.png`, fullPage: true })
await browser.close()
console.log("shot ok")
