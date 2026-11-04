const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('friday', {
  console: {
    get: () => ipcRenderer.invoke('console:get'),
    clear: () => ipcRenderer.invoke('console:clear'),
    onLine: (cb) => {
      const h = (_e, line) => cb(line)
      ipcRenderer.on('console:line', h)
      return () => ipcRenderer.removeListener('console:line', h)
    },
    onToggle: (cb) => {
      const h = () => cb()
      ipcRenderer.on('console:toggle', h)
      return () => ipcRenderer.removeListener('console:toggle', h)
    },
  },
  orb: {
    show: () => ipcRenderer.invoke('orb:show'),
    hide: () => ipcRenderer.invoke('orb:hide'),
    toggle: () => ipcRenderer.invoke('orb:toggle'),
    pin: () => ipcRenderer.invoke('orb:set-pinned', true),
    unpin: () => ipcRenderer.invoke('orb:set-pinned', false),
    setPinned: (pinned) => ipcRenderer.invoke('orb:set-pinned', pinned),
    getState: () => ipcRenderer.invoke('orb:state'),
    openMain: () => ipcRenderer.invoke('orb:focus-main'),
    dragStart: () => ipcRenderer.invoke('orb:drag-start'),
    dragMove: (x, y) => ipcRenderer.send('orb:drag-move', x, y),
    dragEnd: () => ipcRenderer.send('orb:drag-end'),
    onChange: (cb) => {
      const handler = (_e, s) => cb(s)
      ipcRenderer.on('orb:changed', handler)
      return () => ipcRenderer.removeListener('orb:changed', handler)
    },
  },
})
