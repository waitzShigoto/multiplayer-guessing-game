# 🎮 多人輪流專家猜測遊戲

一個基於 WebSocket 的即時多人線上猜測遊戲，支援最多 8 人同時遊玩，具備完整的重連機制、聊天功能和現代化 UI 設計。

## ✨ 功能特色

### 🎯 遊戲核心功能
- **多人即時對戰**：支援 3-8 人同時遊玩
- **輪流專家制**：每回合輪流當專家，增加遊戲公平性
- **智能提示系統**：其他玩家給專家提示，專家根據提示猜測答案
- **計分系統**：猜對得分，提示者也獲得獎勵分數
- **多回合遊戲**：支援多回合連續遊戲

### 🔧 技術特色
- **斷線重連機制**：玩家意外斷線可在 30 秒內重新連接
- **即時聊天功能**：內建聊天室，支援遊戲內溝通
- **響應式設計**：支援桌面和移動設備
- **現代化 UI**：使用 Material Design 3 風格
- **玩家身份標示**：清楚標示當前玩家、專家、室長身份

### 🎨 用戶體驗
- **直觀的玩家卡片**：顯示玩家狀態、得分和身份
- **即時狀態更新**：遊戲狀態即時同步到所有玩家
- **友好的錯誤提示**：清楚的操作反饋和錯誤訊息
- **流暢的動畫效果**：提升用戶互動體驗

## 🏗️ 技術架構

### 前端 (Client)
- **React 18** + **TypeScript** - 現代化前端框架
- **Styled-components** - CSS-in-JS 樣式解決方案
- **Socket.IO Client** - WebSocket 即時通訊
- **響應式設計** - 支援多種設備尺寸

### 後端 (Server)
- **Node.js** + **Express** - 伺服器框架
- **Socket.IO** - WebSocket 伺服器
- **CORS** - 跨域資源共享
- **Nodemon** - 開發環境熱重載

### 專案結構
```
multiplayer-guessing-game/
├── client/                 # React 前端應用
│   ├── src/
│   │   ├── App.tsx        # 主應用組件
│   │   ├── ChatBox.jsx    # 聊天功能組件
│   │   └── index.tsx      # 應用入口
│   ├── public/            # 靜態資源
│   └── package.json       # 前端依賴配置
├── server/                # Node.js 後端
│   ├── index.js          # 伺服器主檔案
│   ├── middleware/       # 中間件
│   ├── models/          # 資料模型
│   └── routes/          # 路由配置
├── package.json         # 專案配置
└── README.md           # 專案說明
```

## 🚀 快速開始

### 環境需求
- Node.js 16.0 或更高版本
- npm 或 yarn 套件管理器

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd multiplayer-guessing-game
   ```

2. **安裝依賴**
   ```bash
   npm run setup
   ```
   此命令會自動安裝根目錄和 client 目錄的所有依賴。

3. **啟動開發環境**
   ```bash
   npm run dev
   ```
   此命令會同時啟動前端和後端服務。

4. **訪問應用**
   - 前端：http://localhost:3000
   - 後端：http://localhost:3001

### 可用腳本

```bash
# 開發環境 - 同時啟動前後端
npm run dev

# 僅啟動後端伺服器
npm run server

# 僅啟動前端應用
npm run client

# 建置前端生產版本
npm run build

# 生產環境啟動
npm start

# 安裝所有依賴
npm run setup
```

## 🎮 遊戲說明

### 遊戲規則

1. **加入遊戲**：輸入暱稱加入房間，第一位玩家自動成為室長
2. **準備階段**：所有玩家點擊「準備」，室長可在至少 3 人準備後開始遊戲
3. **遊戲進行**：
   - 每回合選出一位專家
   - 其他玩家看到答案，給專家提示（不能太明顯）
   - 專家根據提示猜測答案，最多 3 次機會
   - 猜對後進入下一回合，輪換專家
4. **計分系統**：
   - 專家猜對：專家和所有提示者都得分
   - 專家猜錯：無人得分，進入下一回合

### 特殊功能

- **重連機制**：玩家斷線後 30 秒內可重新連接，保持遊戲狀態
- **聊天功能**：遊戲過程中可使用聊天室溝通
- **身份標示**：
  - 🔵 藍色邊框：當前玩家
  - 🟡 金色背景：當前專家
  - 🔴 紅色邊框：室長
- **斷線顯示**：即時顯示斷線玩家數量

## 🔧 開發指南

### 環境變數

在 `server/index.js` 中可配置以下環境變數：

```bash
PORT=3001                    # 伺服器端口
```

### 開發模式

開發時建議使用以下命令：

```bash
# 啟動開發環境（推薦）
npm run dev

# 或分別啟動
npm run server    # 終端 1
npm run client    # 終端 2
```

### 建置部署

```bash
# 建置前端
npm run build

# 啟動生產伺服器
npm start
```

### 程式碼結構

- **前端狀態管理**：使用 React Hooks 管理遊戲狀態
- **即時通訊**：Socket.IO 事件驅動架構
- **樣式系統**：Styled-components 組件化樣式
- **類型安全**：TypeScript 提供完整類型檢查

## 🐛 故障排除

### 常見問題

1. **端口被佔用**
   ```bash
   # 檢查端口使用情況
   lsof -i :3001
   
   # 終止佔用進程
   kill -9 <PID>
   ```

2. **依賴安裝失敗**
   ```bash
   # 清除快取重新安裝
   rm -rf node_modules client/node_modules
   rm package-lock.json client/package-lock.json
   npm run setup
   ```

3. **Socket 連接失敗**
   - 確認後端伺服器正在運行
   - 檢查防火牆設置
   - 確認端口配置正確

## 📝 更新日誌

### v1.0.0
- ✅ 基礎多人遊戲功能
- ✅ 即時聊天系統
- ✅ 斷線重連機制
- ✅ 響應式 UI 設計
- ✅ 玩家身份標示
- ✅ 完整的遊戲狀態管理

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。

---

🎮 **享受遊戲樂趣！** 如有問題或建議，歡迎提出 Issue。
