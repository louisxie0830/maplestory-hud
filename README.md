# MapleStory HUD

MapleStory HUD 是一個以 Electron + React + TypeScript 開發的桌面應用，提供楓之谷遊戲中的即時 EXP/HP/MP 統計與 OCR 解析能力。

## 版本更新

### v0.2.0

- **UI 全面重設計 — Notion 風格**：
  - 移除 MapleStory 深藍金框主題，改為白底、中性灰、乾淨排版、極簡按鈕。
  - 視窗改為固定 420px 窄面板，靠螢幕右側，全螢幕高度。
  - CSS 全面重寫：移除所有漸層、光暈、金線，改用 Notion 配色（`--text: #37352f`、`--color-blue: #2383e2`）。
  - 元件風格：無邊框 stat cards、ghost buttons、tag-style chips、hover 灰底 table rows。
  - Toast 改為白底 + 細灰框 + 小陰影。
  - 捲軸改為 4px 灰色。
- **TopBar 簡化**：標題 16px semibold，移除副標題，狀態改為圓點 + 文字。
- **ControlBar 簡化**：移除 chip 狀態列與步驟提示，視窗選擇改為 ghost button，開始分析改為全寬藍色 primary button。
- **AnalysisPanel 改版**：
  - OCR Health 改為可折疊區塊，預設收合，只顯示一行摘要。
  - Stats 改為 key-value grid（無邊框無背景）。
  - Meta 改為 key-value rows（Notion property 風格）。
  - Recent OCR 改為 Notion table 風格（hover 灰底）。
- **Store 瘦身**：移除 `theme`、`overlayOpacity`、`hudPanel`、`accessibility` state。
- **Icon 重新設計**：白底幾何 "M" + Notion 藍圓點，取代原本深色楓之谷風格圖示。
- **楓幣 / 地圖暫時停用**：meso 與 mapName 相關 UI、OCR listener、capture region 全數註解，後端結構保留。

### v0.1.22

- 主流程重構為「開啟即進入控制台」：
  - 移除 Setup Wizard 與重新執行精靈入口。
  - 啟動後預設不自動擷取，改為使用者先選擇遊戲視窗再開始。
  - 保留視窗清單重整/套用，並在未選視窗時阻擋「開始擷取」。
- 分析面板升級（v8 導向）：
  - 新增 `OCR 健康狀態` 區塊（HP/MP/EXP）。
  - 顯示每區域成功率、平均信心度、平均延遲。
  - 新增弱區域提示（建議重新校準）。
- 測試與品質：
  - 新增 `tests/unit/ocr-health.test.ts`，驗證 OCR 健康分級與弱區域排序邏輯。

### v0.1.21

- HUD 整體介面改版（參考即時統計工具操作流）：
  - 重新整理資訊層級：上方狀態（擷取/OCR訊號/模式）→ 中段統計卡 → 下方操作列。
  - `QuickStats` 擴充為 EXP 專項導向卡片：10/60 分鐘預估、10/60 分鐘累積、每小時 EXP、升級時間。
  - `ControlBar` 新增高頻操作入口：`選擇視窗/來源`、`框選偵測區域`，縮短設定路徑。
  - TopBar 新增 OCR 訊號狀態（正常/不穩/中斷）。
  - 主視覺細節調整（控制列、統計卡、狀態 chip、漸層）以提升可讀性與可操作性。
- 佈局可用性：
  - HUD 預設寬度由 `260` 提升至 `320`，避免新統計資訊擠壓。

### v0.1.20

- GitHub Release 發布流程穩定性修正：
  - 修正 `publish-release` 的 asset 上傳策略，僅發布可下載安裝檔（`.exe` / `.dmg` / `.zip`）。
  - 移除 `*.yml` / `*.blockmap` 由 `action-gh-release` 上傳，避免 `update-a-release-asset` 404 錯誤。

## 產品目標

- 以不干擾遊戲操作為前提，提供可讀且可調整的 HUD。
- 支援「手動選擇遊戲視窗 -> 一鍵開始擷取」的直覺流程。
- 提供可驗收的核心功能與明確發版流程。

## 核心功能

- 固定右側面板視窗（420px，Notion 風格 UI）。
- OCR 擷取與解析：
  - HP / MP / EXP
- EXP 效率統計：
  - 每小時 EXP、10/60 分鐘累積與預估、升級剩餘時間。
- OCR 健康監控：
  - 各區域成功率、信心度、延遲，弱區域提示。

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

## 打包

```bash
npm run build:win   # Windows
npm run build:mac   # macOS
```

輸出檔案位於 `dist/`。

## GitHub Actions

- `.github/workflows/ci.yml` — push / PR 時執行 typecheck + lint + test + build。
- `.github/workflows/release-win.yml` — `v*` tag 觸發雙平台打包並發布 GitHub Release。
