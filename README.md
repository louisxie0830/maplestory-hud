# MapleStory HUD

MapleStory HUD 是一個以 Electron + React + TypeScript 開發的桌面覆蓋層（overlay）應用，提供楓之谷遊戲中的即時資訊顯示與 OCR 解析能力。

## 產品目標（PM）

- 以不干擾遊戲操作為前提，提供可讀且可調整的 HUD。
- 支援首次啟動精靈（Setup Wizard）降低上手成本。
- 提供可驗收的核心功能與明確發版流程。

## 核心功能

- 全螢幕透明 HUD 視窗（可鎖定/可互動模式切換）。
- OCR 擷取與解析：
  - HP / MP / EXP
  - 傷害紀錄
  - 楓幣（Meso）
- 全域快捷鍵：
  - `F7`：擷取啟停
  - `F8`：重置統計
  - `F9`：鎖定模式切換
  - `F10`：截圖
- 系統匣控制與 Logs 視窗。
- 設定面板（主題、擷取設定、OCR 校正、區域選取）。

## 技術架構

- Electron（Main / Preload / Renderer）
- React + Zustand（Renderer 狀態管理）
- Tesseract.js（OCR）
- electron-builder（Windows NSIS / macOS DMG）
- Vitest + ESLint + TypeScript（品質關卡）

## 本機開發

```bash
npm ci
npm run dev
```

## 品質檢查

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

或一次執行：

```bash
npm run release:check
```

## Windows 打包

```bash
npm run build:win
```

輸出檔案位於 `dist/`。

## GitHub Actions（DevOps）

- `.github/workflows/ci.yml`
  - 在 push / PR 時執行 `typecheck + lint + test + build`。
- `.github/workflows/release-win.yml`
  - 在建立 `v*` tag 時執行 Windows 打包，並上傳安裝檔 artifact。
  - 同時建立 GitHub Release 並附上安裝檔。

## 驗收清單（PM）

- [ ] 首次啟動時正確進入 Setup Wizard。
- [ ] 完成設定後可進入 HUD 主畫面且可保存狀態。
- [ ] F7/F8/F9/F10 皆可觸發且 HUD 有對應提示。
- [ ] OCR 結果能穩定更新到 HUD。
- [ ] 視窗找不到時可自動暫停並可恢復。
- [ ] `npm run release:check` 全數通過。
- [ ] Windows CI 成功產出安裝檔 artifact。
