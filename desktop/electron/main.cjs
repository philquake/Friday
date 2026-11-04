const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen } = require('electron')
const fs = require('fs')
const path = require('path')

const DEV_URL = process.env.FRIDAY_URL || 'http://localhost:5173'
const ORB_SIZE = 260
const prefsPath = () => path.join(app.getPath('userData'), 'orb.json')

let mainWin = null
let orbWin = null
let tray = null
let quitting = false

/* ─── Console: tails logs/*.log written by `main.py --ui` and captures page console output ─── */
const LOG_DIR = path.join(__dirname, '..', '..', 'logs')
const MAX_LINES = 2000
const consoleLines = []

function pushLine(source, text, level = 'info') {
  // eslint-disable-next-line no-control-regex
  const line = { t: Date.now(), source, level, text: text.replace(/\x1b\[[0-9;]*m/g, '') }
  consoleLines.push(line)
  if (consoleLines.length > MAX_LINES) consoleLines.shift()
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('console:line', line)
}

function guessLevel(text) {
  if (/\b(error|traceback|exception|critical)\b/i.test(text)) return 'error'
  if (/\bwarn(ing)?\b/i.test(text)) return 'warn'
  return 'info'
}

function tailLog(source, file) {
  let pos = 0
  let partial = ''
  const read = () => {
    let size
    try {
      size = fs.statSync(file).size
    } catch {
      return
    }
    if (size < pos) pos = 0 // file was truncated by a relaunch
    if (size === pos) return
    const fd = fs.openSync(file, 'r')
    try {
      const buf = Buffer.alloc(size - pos)
      fs.readSync(fd, buf, 0, buf.length, pos)
      pos = size
      const parts = (partial + buf.toString('utf8')).split(/\r?\n/)
      partial = parts.pop()
      for (const p of parts) if (p.trim()) pushLine(source, p, guessLevel(p))
    } finally {
      fs.closeSync(fd)
    }
  }
  setInterval(read, 500)
  read()
}

function startConsoleCapture() {
  tailLog('api', path.join(LOG_DIR, 'api.log'))
  tailLog('vite', path.join(LOG_DIR, 'vite.log'))
}

function toggleConsole() {
  if (mainWin && !mainWin.isDestroyed()) {
    showMain()
    mainWin.webContents.send('console:toggle')
  }
}
let prefs = { x: null, y: null, pinned: true }

function loadPrefs() {
  try {
    prefs = { ...prefs, ...JSON.parse(fs.readFileSync(prefsPath(), 'utf8')) }
  } catch {
    /* first run */
  }
}

function savePrefs() {
  try {
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs))
  } catch {
    /* non-fatal */
  }
}

function appUrl(query = '') {
  if (app.isPackaged) {
    return { file: path.join(__dirname, '..', 'dist', 'index.html'), query }
  }
  return { url: DEV_URL + query }
}

function load(win, query = '') {
  const t = appUrl(query)
  if (t.file) win.loadFile(t.file, { search: query.replace(/^\?/, '') })
  else win.loadURL(t.url)
}

function applyPinned() {
  if (!orbWin) return
  orbWin.setAlwaysOnTop(prefs.pinned, 'screen-saver')
  orbWin.webContents.send('orb:changed', { visible: orbWin.isVisible(), pinned: prefs.pinned })
  if (mainWin) mainWin.webContents.send('orb:changed', { visible: orbWin.isVisible(), pinned: prefs.pinned })
  buildMenu()
}

/** 32x32 white ring on transparent, drawn in code so no icon asset is needed. */
function trayIcon() {
  const size = 32
  const buf = Buffer.alloc(size * size * 4)
  const c = (size - 1) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c)
      const ring = d <= 13 && d >= 9
      const core = d <= 5
      if (ring || core) buf.writeUInt32LE(0xffffffff, (y * size + x) * 4) // BGRA white, opaque
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 })
}

function showMain() {
  if (!mainWin) return
  mainWin.show()
  if (mainWin.isMinimized()) mainWin.restore()
  mainWin.focus()
}

function minimizeToTray() {
  if (!mainWin) return
  mainWin.hide()
  if (!tray) {
    tray = new Tray(trayIcon())
    tray.setToolTip('Friday')
    tray.on('click', showMain)
  }
  buildMenu()
  if (!(orbWin && orbWin.isVisible())) setOrbVisible(true) // keep Friday reachable
}

function buildTrayMenu(orbVisible) {
  if (!tray) return
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Friday', click: showMain },
      { label: 'Floating Orb', type: 'checkbox', checked: orbVisible, click: () => setOrbVisible(!orbVisible) },
      {
        label: 'Orb Always on Top',
        type: 'checkbox',
        checked: prefs.pinned,
        click: (item) => {
          prefs.pinned = item.checked
          savePrefs()
          applyPinned()
        },
      },
      { type: 'separator' },
      { label: 'Quit Friday', click: () => app.quit() },
    ]),
  )
}

function buildMenu() {
  const orbVisible = !!(orbWin && orbWin.isVisible())
  buildTrayMenu(orbVisible)
  const template = [
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Floating Orb',
          type: 'checkbox',
          accelerator: 'CommandOrControl+Shift+O',
          checked: orbVisible,
          click: () => setOrbVisible(!orbVisible),
        },
        {
          label: 'Orb Always on Top',
          type: 'checkbox',
          checked: prefs.pinned,
          click: (item) => {
            prefs.pinned = item.checked
            savePrefs()
            applyPinned()
          },
        },
        { label: 'Console', accelerator: 'CommandOrControl+`', click: toggleConsole },
        { label: 'Minimize to Tray', accelerator: 'CommandOrControl+M', click: minimizeToTray },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createOrbWindow() {
  const area = screen.getPrimaryDisplay().workArea
  const x = prefs.x ?? area.x + area.width - ORB_SIZE - 40
  const y = prefs.y ?? area.y + area.height - ORB_SIZE - 40
  orbWin = new BrowserWindow({
    x,
    y,
    width: ORB_SIZE,
    height: ORB_SIZE,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: prefs.pinned,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true },
  })
  load(orbWin, '?mode=orb')
  orbWin.on('moved', () => {
    const [px, py] = orbWin.getPosition()
    prefs.x = px
    prefs.y = py
    savePrefs()
  })
  orbWin.on('closed', () => {
    orbWin = null
  })
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#000000',
    // backgroundThrottling off: hands-free / "Hey Friday" must keep listening while hidden in the tray
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, backgroundThrottling: false },
  })
  load(mainWin)
  mainWin.webContents.on('console-message', (event) => {
    if (event.message) pushLine('ui', event.message, event.level === 'warning' ? 'warn' : event.level)
  })
  mainWin.on('minimize', (e) => {
    e.preventDefault()
    minimizeToTray()
  })
  mainWin.on('close', (e) => {
    // The X button sends Friday to the tray; only Quit (tray menu / app quit) really exits.
    if (!quitting) {
      e.preventDefault()
      minimizeToTray()
    }
  })
  mainWin.on('closed', () => {
    mainWin = null
    app.quit()
  })
}

function setOrbVisible(visible) {
  if (!orbWin) createOrbWindow()
  if (visible) orbWin.showInactive()
  else orbWin.hide()
  applyPinned()
}

ipcMain.handle('orb:show', () => setOrbVisible(true))
ipcMain.handle('orb:hide', () => setOrbVisible(false))
ipcMain.handle('orb:toggle', () => setOrbVisible(!(orbWin && orbWin.isVisible())))
ipcMain.handle('orb:set-pinned', (_e, pinned) => {
  prefs.pinned = !!pinned
  savePrefs()
  applyPinned()
})
ipcMain.handle('orb:state', () => ({ visible: !!(orbWin && orbWin.isVisible()), pinned: prefs.pinned }))
ipcMain.handle('orb:focus-main', () => {
  showMain()
  setOrbVisible(false)
})
ipcMain.handle('orb:drag-start', () => (orbWin ? orbWin.getPosition() : [0, 0]))
ipcMain.on('orb:drag-move', (_e, x, y) => {
  if (orbWin) orbWin.setBounds({ x: Math.round(x), y: Math.round(y), width: ORB_SIZE, height: ORB_SIZE })
})
ipcMain.on('orb:drag-end', () => {
  if (!orbWin) return
  const [px, py] = orbWin.getPosition()
  prefs.x = px
  prefs.y = py
  savePrefs()
})
ipcMain.handle('console:get', () => consoleLines)
ipcMain.handle('console:clear', () => {
  consoleLines.length = 0
})

app.whenReady().then(() => {
  loadPrefs()
  createMainWindow()
  createOrbWindow()
  buildMenu()
  startConsoleCapture()
})

app.on('before-quit', () => {
  quitting = true
})

app.on('window-all-closed', () => app.quit())
