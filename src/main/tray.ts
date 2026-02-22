import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron'
import { showLogWindow } from './log-window'
import log from 'electron-log/main'
import { getIconPath } from './utils/icon'

let tray: Tray | null = null

/**
 * 建立系統匣圖示與右鍵選單，提供顯示/隱藏 HUD、查看 Log、結束等操作
 * @param overlayWindow - 主覆蓋視窗實例，用於控制顯示/隱藏
 * @returns 建立的系統匣實例
 */
export function createTray(overlayWindow: BrowserWindow): Tray {
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 })
  } catch {
    icon = nativeImage.createEmpty()
    log.warn('Tray icon not found, using empty icon')
  }

  tray = new Tray(icon)
  tray.setToolTip('MapleStory HUD')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '顯示/隱藏 HUD',
      click: () => {
        if (overlayWindow.isVisible()) {
          overlayWindow.hide()
          log.info('Overlay hidden')
        } else {
          overlayWindow.show()
          log.info('Overlay shown')
        }
      }
    },
    { type: 'separator' },
    {
      label: '查看 Log',
      click: () => {
        showLogWindow()
      }
    },
    { type: 'separator' },
    {
      label: 'F7 啟停擷取 | F8 重置統計 | F9 鎖定切換 | F10 截圖',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '結束',
      click: () => {
        overlayWindow.destroy()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  log.info('System tray created')
  return tray
}
