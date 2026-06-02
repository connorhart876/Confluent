import { app, BrowserWindow, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb } from './db'
import { registerHandlers } from './ipc'
import { initApiKeyStore } from './security/api-key-store'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    show: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.confluent.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    initDb()
  } catch (e) {
    const dbPath = join(app.getPath('userData'), 'confluent.db')
    dialog.showErrorBox(
      'Database Error',
      `Confluent could not open its database. The file may be corrupted.\n\n` +
      `Database path:\n${dbPath}\n\n` +
      `To recover:\n` +
      `1. Navigate to the path above\n` +
      `2. Delete or rename confluent.db\n` +
      `3. Restart Confluent — a fresh database will be created automatically\n\n` +
      `Error: ${e instanceof Error ? e.message : String(e)}`
    )
    app.quit()
    return
  }
  initApiKeyStore(join(app.getPath('userData'), 'api-key.enc'))
  registerHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
