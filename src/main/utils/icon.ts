import { app, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import log from 'electron-log/main'

/** 取得應用程式圖示的檔案路徑（依平台自動選擇 .ico 或 .png） */
export function getIconPath(): string {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', iconName)
  }
  const preferred = join(app.getAppPath(), 'resources', iconName)
  if (existsSync(preferred)) return preferred
  return join(app.getAppPath(), 'resources', 'icon.png')
}

/** 套用應用程式圖示至 macOS Dock（僅限 macOS 平台） */
export function applyAppIcon(): void {
  if (process.platform !== 'darwin') return
  try {
    const image = nativeImage.createFromPath(getIconPath())
    if (!image.isEmpty() && app.dock) {
      app.dock.setIcon(image)
    }
  } catch (err) {
    log.warn('Failed to set dock icon:', err)
  }
}
