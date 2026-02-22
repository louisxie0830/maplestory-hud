# MapleStory HUD

MapleStory HUD 是一個以 Electron + React + TypeScript 開發的桌面覆蓋層（overlay）應用，提供楓之谷遊戲中的即時資訊顯示與 OCR 解析能力。

## 版本更新

### v0.1.12

- 全面功能升級（10 項）：
  - 自動更新檢查：新增 GitHub Release 版本比對（可在進階設定一鍵檢查）。
  - OCR 健康檢查：新增每區域成功率/延遲/信心度統計與重置。
  - 重新校準精靈：新增「重跑設定精靈」入口。
  - 設定匯入/匯出：新增 JSON 備份與還原。
  - Crash 報告：全域錯誤自動寫入 `userData/crash-reports`，可匯出最近 crash。
  - HUD 模板：新增 `最小化 / 打王 / 練功` 版面模板。
  - 快捷鍵衝突檢查：新增重複鍵位檢查與套用前驗證。
  - 效能模式：新增 `高更新率 / 平衡 / 省電`（影響擷取間隔倍率）。
  - 可及性：新增字體縮放與高對比模式。
  - 資料來源插件：新增 `bundled/plugin` 切換與 plugin data folder 支援。
- i18n 基礎：
  - 新增語系狀態（`zh-TW / en`）與設定分頁文案映射基礎架構。
- CI/CD：
  - 延續 tag 發版流程，並維持 `release:check` 關卡。

### v0.1.11

- CI/CD 升級（參考 `ms-assistant`）：
  - `Release Windows` workflow 改為 `build-windows` + `publish-release` 雙 job。
  - 先在 Windows 打包並上傳 artifact，再由 Ubuntu 發布 GitHub Release。
  - 新增 release 併發控制與 artifact 檔案存在檢查（`if-no-files-found: error`）。
- CI：
  - 新增 concurrency 控制，避免同一 ref 重複跑 CI。

### v0.1.10

- 發版一致性：
  - `package.json` 版本更新為 `0.1.10`，修正 release 檔名與 tag 版本不同步問題。
  - `release:check` 新增 tag 與 `package.json` 版本一致性檢查（CI 在 tag 觸發時會阻擋不一致版本）。
- UI：
  - About 頁版本改為動態讀取 app 真實版本，避免硬編碼顯示錯誤。

### v0.1.9

- 新功能：
  - 新增「診斷報告匯出」功能（About 頁一鍵輸出 JSON）。
  - 診斷內容包含 app 版本、平台資訊、關鍵設定、telemetry 計數與 log 路徑。
- 可維運性：
  - 問題回報可直接附診斷檔，縮短定位時間。
  - 新增 `diagnostics.exported` 事件計數，方便追蹤支援流程使用率。

### v0.1.8

- OCR 強化：
  - `EXP` 解析新增無 `%` 後備規則（OCR 漏符號時仍可讀取）。
  - `Meso` 解析改為從多段數字中挑最大值，降低雜訊誤判。
- QA：
  - 新增 parser 單元測試（`EXP`、`Meso`）。
- 互動分析：
  - Setup / 控制列操作加入事件追蹤（本機 telemetry）。
- 安全與發版流程：
  - 維持 `tag` 才觸發 workflow。
  - Release workflow 會自動建立 GitHub Release 並上傳資產。

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
  - 同時執行 Windows smoke build（`windows-latest` + `build:win`）並上傳安裝檔 artifact。
- `.github/workflows/release-win.yml`
  - 在建立 `v*` tag 時執行 Windows 打包，並上傳安裝檔 artifact。
  - 同時建立 GitHub Release 並附上安裝檔。

## Windows 安裝驗證流程

1. 推送到 `master` 後，前往 GitHub Actions 的 `CI` workflow。
2. 等待 `windows-smoke` job 成功。
3. 下載 artifact `windows-smoke-installer`（`win-unpacked`）。
4. 在 job log 確認 `Run Windows executable smoke test` 有輸出 app 版本。
5. 在 Windows 11/10 執行安裝檔（正式版用 `Release Windows` 的 `.exe`），確認：
   - 可正常開啟 HUD
   - 系統匣存在
   - F7/F8/F9/F10 可觸發

## 驗收清單（PM）

- [ ] 首次啟動時正確進入 Setup Wizard。
- [ ] 完成設定後可進入 HUD 主畫面且可保存狀態。
- [ ] F7/F8/F9/F10 皆可觸發且 HUD 有對應提示。
- [ ] OCR 結果能穩定更新到 HUD。
- [ ] 視窗找不到時可自動暫停並可恢復。
- [ ] `npm run release:check` 全數通過。
- [ ] Windows CI 成功產出安裝檔 artifact。
