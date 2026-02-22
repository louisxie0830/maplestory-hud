const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const { join, resolve } = require('node:path')

function buildMockScript() {
  return `
<script>
window.electronAPI = {
  isSetupCompleted: async () => true,
  setMousePassthrough: () => {},
  onOcrResult: (type, cb) => {
    const now = Date.now();
    const payloads = {
      hp: { data: { current: 28500, max: 40000 } },
      mp: { data: { current: 18200, max: 23000 } },
      exp: { data: { percent: 67.42 } },
      meso: { data: { amount: 126734567 } },
      damage: {
        data: [
          { value: 3240000, timestamp: now - 16000 },
          { value: 2190000, timestamp: now - 12000 },
          { value: 4150000, timestamp: now - 8000 },
          { value: 2890000, timestamp: now - 4000 },
          { value: 5320000, timestamp: now }
        ]
      }
    };
    setTimeout(() => {
      if (payloads[type]) cb(payloads[type]);
    }, 80);
    return () => {};
  },
  onModeChanged: (cb) => { setTimeout(() => cb('locked'), 50); return () => {}; },
  onCaptureAutoPaused: () => () => {},
  onCaptureAutoResumed: () => () => {},
  onCaptureToggled: (cb) => { setTimeout(() => cb(true), 60); return () => {}; },
  onStatsReset: () => () => {},
  onScreenshotTaken: () => () => {},
  onOpacityChanged: () => () => {},
  getSettings: async () => ({
    overlay: { theme: 'dark', opacity: 1 },
    captureRegions: {},
    captureIntervals: {},
    ocr: { confidenceThreshold: 55, preprocessInvert: true, preprocessThreshold: 150 }
  }),
  getCaptureRunning: async () => true,
  toggleClickThrough: async () => false,
  pauseCapture: async () => {},
  resumeCapture: async () => {},
  openLogViewer: async () => {},
  quitApp: async () => {},
  updateSettings: async () => {},
  getSettingsKey: async () => ({}),
  updateCaptureJob: async () => {},
  setCaptureInterval: async () => {},
  updateOcrSettings: async () => {},
  openRegionSelector: async () => {}
};
</script>
  `.trim()
}

async function main() {
  const root = process.cwd()
  const rendererDir = resolve(root, 'out/renderer')
  const htmlPath = join(rendererDir, 'index.html')
  const html = readFileSync(htmlPath, 'utf8')

  const mainScriptMatch = html.match(/<script type="module" crossorigin src="\.\/assets\/main-[^"]+"><\/script>/)
  if (!mainScriptMatch) {
    throw new Error('Cannot find renderer main script tag in out/renderer/index.html')
  }

  const injected = html
    .replace(mainScriptMatch[0], `${buildMockScript()}\n    ${mainScriptMatch[0]}`)
    .replace('</head>', '    <style>html,body{background:radial-gradient(circle at 30% 20%,#1c2548 0%,#0f1327 55%,#080a16 100%) !important;}</style>\n  </head>')

  const previewFile = join(rendererDir, 'index.preview.html')
  writeFileSync(previewFile, injected)

  await app.whenReady()

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#0a0d1e',
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  })

  await win.loadFile(previewFile)
  await new Promise((resolveWait) => setTimeout(resolveWait, 1200))

  const image = await win.webContents.capturePage()
  const outputDir = resolve(root, 'out/ui-review')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = join(outputDir, 'hud-ui-v2.png')
  writeFileSync(outputPath, image.toPNG())

  console.log(outputPath)
  await win.destroy()
  app.quit()
}

main().catch((err) => {
  console.error(err)
  app.quit()
  process.exit(1)
})
