#!/bin/bash

echo "🎮 多人輪流專家猜測遊戲 - 安裝腳本 (TypeScript版本)"
echo "================================================="

# 檢查 Node.js 是否已安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝！"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 建立專案結構
echo "📁 建立專案結構..."
mkdir -p server/models server/routes server/middleware
mkdir -p client/src/components client/src/hooks client/src/utils client/src/types
mkdir -p client/public

# 安裝後端依賴
echo "📦 安裝後端依賴..."
npm install

# 建立 React TypeScript 應用
echo "⚛️ 建立 React TypeScript 前端..."
if [ ! -d "client/node_modules" ]; then
    cd client
    npx create-react-app . --template typescript
    # 安裝額外依賴
    npm install socket.io-client styled-components
    npm install --save-dev @types/styled-components
    cd ..
fi

# 建立 TypeScript 類型定義
echo "📝 建立 TypeScript 類型定義..."
cat > client/src/types/index.ts << 'EOF'
export interface Player {
  id: string;
  nickname: string;
  ready: boolean;
  score: number;
  connected: boolean;
}

export interface Hint {
  playerId: string;
  playerName: string;
  hint: string;
}

export interface GameState {
  gamePhase: 'waiting' | 'playing' | 'finished';
  players: Player[];
  playerCount: number;
  maxPlayers: number;
  roomLeader: string | null;
  round: number;
  currentExpert: Player | null;
  currentCategory: string;
  hints: Hint[];
  guessAttempts: number;
  maxGuessAttempts: number;
}

export interface Message {
  id: number;
  text: string;
  isError: boolean;
}
EOF

# 建立 .gitignore
echo "📝 建立 .gitignore..."
cat > .gitignore << EOF
node_modules/
.env
.DS_Store
client/build/
*.log
.vscode/settings.json
dist/
build/
EOF

# 建立 README
echo "📖 建立 README..."
cat > README.md << 'EOF'
# 🎮 多人輪流專家猜測遊戲 (TypeScript版本)

## 🚀 快速開始

1. 安裝依賴：
   ```bash
   npm run setup
   ```

2. 啟動開發環境：
   ```bash
   npm run dev
   ```

3. 開啟瀏覽器訪問：
   - 前端：http://localhost:3000
   - 後端：http://localhost:5000

## 🎯 遊戲規則

- 最多8人同時遊玩
- 每人輪流當專家
- 專家根據其他人的提示猜測答案
- 猜對得分，提示者也獲得分數

## 🛠️ 技術棧

- 後端：Node.js + Express + Socket.io
- 前端：React + TypeScript + Socket.io-client + Styled-components
- 即時通訊：WebSocket

## 📁 專案結構

```
multiplayer-guessing-game/
├── server/                 # 後端
│   ├── index.js           # 主伺服器檔案
│   └── models/            # 資料模型
├── client/                # 前端
│   ├── src/
│   │   ├── App.tsx        # 主應用組件
│   │   ├── types/         # TypeScript 類型定義
│   │   └── components/    # React 組件
│   └── package.json
├── package.json           # 根目錄依賴
└── .env                   # 環境變數
```

## 🎮 多人遊玩

### 本地網路遊玩
1. 確保所有裝置連接到同一 WiFi
2. 在伺服器電腦上運行 `npm run dev`
3. 其他人訪問 `http://[伺服器IP]:3000`

### 獲取本機 IP
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```
EOF

echo ""
echo "🎉 TypeScript 版本安裝完成！"
echo ""
echo "📋 下一步："
echo "1. npm run dev     # 啟動開發環境"
echo "2. 開啟 http://localhost:3000"
echo "3. 邀請朋友一起遊玩！"
echo ""
echo "💡 TypeScript 優勢："
echo "- 類型安全，減少運行時錯誤"
echo "- 更好的 IDE 支援和自動完成"
echo "- 更容易維護和重構"
echo "- 更好的團隊協作體驗"
echo ""
echo "🔧 VS Code 推薦擴展："
echo "- TypeScript Hero"
echo "- ES7+ React/Redux/React-Native snippets"
echo "- Prettier - Code formatter"
echo "- Auto Rename Tag"#!/bin/bash

echo "🎮 多人輪流專家猜測遊戲 - 安裝腳本"
echo "======================================="

# 檢查 Node.js 是否已安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝！"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 建立專案結構
echo "📁 建立專案結構..."
mkdir -p server/models server/routes server/middleware
mkdir -p client/src/components client/src/hooks client/src/utils
mkdir -p client/public

# 安裝後端依賴
echo "📦 安裝後端依賴..."
npm install

# 建立 React 應用
echo "⚛️ 建立 React 前端..."
if [ ! -d "client/node_modules" ]; then
    cd client
    npx create-react-app . --template typescript
    npm install socket.io-client styled-components
    cd ..
fi

# 建立 .gitignore
echo "📝 建立 .gitignore..."
cat > .gitignore << EOF
node_modules/
.env
.DS_Store
client/build/
*.log
.vscode/settings.json
EOF

# 建立 README
echo "📖 建立 README..."
cat > README.md << EOF
# 🎮 多人輪流專家猜測遊戲

## 🚀 快速開始

1. 安裝依賴：
   \`\`\`bash
   npm run setup
   \`\`\`

2. 啟動開發環境：
   \`\`\`bash
   npm run dev
   \`\`\`

3. 開啟瀏覽器訪問：
   - 前端：http://localhost:3000
   - 後端：http://localhost:5000

## 🎯 遊戲規則

- 最多8人同時遊玩
- 每人輪流當專家
- 專家根據其他人的提示猜測答案
- 猜對得分，提示者也獲得分數

## 🛠️ 技術棧

- 後端：Node.js + Express + Socket.io
- 前端：React + Socket.io-client + Styled-components
- 即時通訊：WebSocket
EOF

echo ""
echo "🎉 安裝完成！"
echo ""
echo "📋 下一步："
echo "1. npm run dev     # 啟動開發環境"
echo "2. 開啟 http://localhost:3000"
echo "3. 邀請朋友一起遊玩！"
echo ""
echo "💡 提示："
echo "- 使用 VS Code 開啟專案獲得最佳開發體驗"
echo "- 安裝推薦的 VS Code 擴展"
echo "- 查看 README.md 了解更多資訊"
