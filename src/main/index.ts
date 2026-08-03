import { app, BrowserWindow } from 'electron'
import { registerMediaScheme, registerMediaProtocol } from './media'
import { openDatabase, closeDatabase } from './db'
import { registerIpcHandlers } from './ipc'
import { createMainWindow } from './window'

// Must run before app is ready.
registerMediaScheme()

app.whenReady().then(() => {
  registerMediaProtocol()
  openDatabase()
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  closeDatabase()
})
