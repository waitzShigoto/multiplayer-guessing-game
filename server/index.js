const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL, "https://multiplayer-game-frontend.onrender.com"]
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 中間件
app.use(cors());
app.use(express.json());

// 聊天訊息存儲 (簡單的內存存儲)
class ChatManager {
  constructor() {
    this.messages = [];
    this.maxMessages = 50; // 最多保存50條訊息
  }

  addMessage(playerId, playerName, message, type = 'chat') {
    const chatMessage = {
      id: Date.now() + Math.random(),
      playerId,
      playerName,
      message,
      type, // 'chat', 'system', 'game'
      timestamp: new Date().toISOString()
    };

    this.messages.push(chatMessage);

    // 保持訊息數量在限制內
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    return chatMessage;
  }

  getRecentMessages(limit = 20) {
    return this.messages.slice(-limit);
  }

  addSystemMessage(message) {
    return this.addMessage('system', '系統', message, 'system');
  }

  addGameMessage(message) {
    return this.addMessage('game', '遊戲', message, 'game');
  }
}

// 遊戲狀態管理
class GameState {
  constructor() {
    this.players = new Map(); // socketId -> player
    this.playersByNickname = new Map(); // nickname -> player (用於重連)
    this.disconnectedPlayers = new Map(); // nickname -> player (暫時斷線的玩家)
    this.gamePhase = 'waiting'; // waiting, playing, finished
    this.currentExpertId = null; // 改用玩家ID而不是索引
    this.round = 1;
    this.currentTopic = '';
    this.currentCategory = '';
    this.hints = [];
    this.roomLeader = null;
    this.maxPlayers = 8;
    this.minPlayers = 3;
    this.guessAttempts = 0;
    this.maxGuessAttempts = 3;
    this.reconnectTimeout = 30000; // 30秒重連時間
    
    this.topics = [
      { 
        category: '動物', 
        items: ['大象', '貓咪', '狗狗', '老虎', '熊貓', '企鵝', '獅子', '猴子', '兔子', '長頸鹿'] 
      },
      { 
        category: '食物', 
        items: ['披薩', '漢堡', '壽司', '拉麵', '炒飯', '牛排', '沙拉', '冰淇淋', '蛋糕', '水餃'] 
      },
      { 
        category: '電影', 
        items: ['復仇者聯盟', '鐵達尼號', '哈利波特', '星際大戰', '侏羅紀公園', '獅子王', '冰雪奇緣', '玩具總動員'] 
      },
      { 
        category: '職業', 
        items: ['醫生', '老師', '警察', '消防員', '廚師', '程式設計師', '藝術家', '律師', '工程師', '護士'] 
      },
      { 
        category: '國家', 
        items: ['日本', '美國', '法國', '義大利', '澳洲', '巴西', '印度', '埃及', '德國', '韓國'] 
      },
      { 
        category: '日常用品', 
        items: ['手機', '電腦', '椅子', '杯子', '筆', '書', '時鐘', '鏡子', '鑰匙', '錢包'] 
      }
    ];
  }

  addPlayer(socketId, nickname) {
    // 檢查是否為重連玩家
    const disconnectedPlayer = this.disconnectedPlayers.get(nickname);
    if (disconnectedPlayer) {
      // 重連邏輯
      return this.reconnectPlayer(socketId, nickname);
    }

    // 檢查遊戲狀態 - 遊戲進行中不允許新玩家加入
    if (this.gamePhase === 'playing') {
      return { success: false, message: '遊戲進行中，無法加入新玩家。請等待本局結束。' };
    }

    // 檢查房間是否已滿
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: '房間已滿' };
    }

    // 檢查暱稱是否重複
    if (this.playersByNickname.has(nickname)) {
      return { success: false, message: '暱稱已被使用' };
    }

    const player = {
      id: socketId,
      nickname,
      ready: false,
      score: 0,
      connected: true,
      joinTime: Date.now()
    };

    this.players.set(socketId, player);
    this.playersByNickname.set(nickname, player);

    // 設定第一個玩家為室長
    if (this.players.size === 1) {
      this.roomLeader = socketId;
    }

    return { success: true, player, isReconnect: false };
  }

  reconnectPlayer(socketId, nickname) {
    const disconnectedPlayer = this.disconnectedPlayers.get(nickname);
    if (!disconnectedPlayer) {
      return { success: false, message: '找不到斷線的玩家記錄' };
    }

    // 更新玩家的socket ID
    disconnectedPlayer.id = socketId;
    disconnectedPlayer.connected = true;

    // 移回到活躍玩家列表
    this.players.set(socketId, disconnectedPlayer);
    this.disconnectedPlayers.delete(nickname);

    // 如果重連的玩家原本是室長，恢復室長身份
    if (disconnectedPlayer.wasRoomLeader) {
      this.roomLeader = socketId;
      delete disconnectedPlayer.wasRoomLeader;
    }

    return { 
      success: true, 
      player: disconnectedPlayer, 
      isReconnect: true,
      gameState: this.getGameState()
    };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return false;

    // 如果遊戲正在進行，將玩家標記為斷線而不是完全移除
    if (this.gamePhase === 'playing') {
      player.connected = false;
      
      // 如果是室長斷線，記錄這個狀態
      if (this.roomLeader === socketId) {
        player.wasRoomLeader = true;
        // 暫時選擇新室長
        const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected && p.id !== socketId);
        if (connectedPlayers.length > 0) {
          this.roomLeader = connectedPlayers[0].id;
        }
      }

      // 移到斷線玩家列表
      this.disconnectedPlayers.set(player.nickname, player);
      this.players.delete(socketId);

      // 設定重連超時
      setTimeout(() => {
        if (this.disconnectedPlayers.has(player.nickname)) {
          this.disconnectedPlayers.delete(player.nickname);
          this.playersByNickname.delete(player.nickname);
          
          // 如果是當前專家斷線且超時，跳到下一個專家
          if (this.currentExpertId === socketId) {
            this.nextExpert();
          }
        }
      }, this.reconnectTimeout);

      return true;
    } else {
      // 遊戲未開始，完全移除玩家
      this.players.delete(socketId);
      this.playersByNickname.delete(player.nickname);

      // 如果室長離開，選擇新室長
      if (this.roomLeader === socketId && this.players.size > 0) {
        this.roomLeader = this.players.keys().next().value;
      }

      return true;
    }
  }

  togglePlayerReady(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = !player.ready;
      return player.ready;
    }
    return false;
  }

  canStartGame() {
    if (this.players.size < this.minPlayers) return false;
    for (let player of this.players.values()) {
      if (!player.ready) return false;
    }
    return true;
  }

  startGame() {
    if (!this.canStartGame()) return false;
    
    this.gamePhase = 'playing';
    this.round = 1;
    
    // 選擇第一個專家（使用玩家ID而不是索引）
    const playersArray = Array.from(this.players.keys());
    this.currentExpertId = playersArray[0];
    
    this.startNewRound();
    return true;
  }

  startNewRound() {
    this.hints = [];
    this.guessAttempts = 0;
    
    // 隨機選擇主題
    const category = this.topics[Math.floor(Math.random() * this.topics.length)];
    const item = category.items[Math.floor(Math.random() * category.items.length)];
    
    this.currentTopic = item;
    this.currentCategory = category.category;
  }

  addHint(socketId, hint) {
    // 專家不能給提示
    if (socketId === this.currentExpertId) return false;
    
    // 檢查是否已經給過提示
    const existingHint = this.hints.find(h => h.playerId === socketId);
    if (existingHint) return false;

    const player = this.players.get(socketId);
    if (!player) return false;

    this.hints.push({
      playerId: socketId,
      playerName: player.nickname,
      hint: hint
    });

    return true;
  }

  makeGuess(socketId, guess) {
    // 只有專家可以猜測
    if (socketId !== this.currentExpertId) return { success: false, message: '只有專家可以猜測' };

    this.guessAttempts++;
    const isCorrect = guess.toLowerCase().trim() === this.currentTopic.toLowerCase().trim();

    if (isCorrect) {
      // 專家得分
      const expert = this.players.get(this.currentExpertId);
      if (expert) {
        expert.score += 10;
      }

      // 提示者得分
      this.hints.forEach(hint => {
        const hintPlayer = this.players.get(hint.playerId);
        if (hintPlayer) {
          hintPlayer.score += 5;
        }
      });

      return { 
        success: true, 
        correct: true, 
        answer: this.currentTopic,
        message: '猜對了！' 
      };
    } else {
      if (this.guessAttempts >= this.maxGuessAttempts) {
        return { 
          success: true, 
          correct: false, 
          answer: this.currentTopic,
          message: `猜錯了！答案是：${this.currentTopic}` 
        };
      } else {
        return { 
          success: true, 
          correct: false, 
          answer: null,
          message: `不對哦！還有 ${this.maxGuessAttempts - this.guessAttempts} 次機會` 
        };
      }
    }
  }

  nextExpert() {
    const playersArray = Array.from(this.players.keys());
    const currentIndex = playersArray.indexOf(this.currentExpertId);
    
    if (currentIndex === -1) {
      // 當前專家不在列表中（可能斷線），選擇第一個玩家
      this.currentExpertId = playersArray[0];
    } else {
      // 選擇下一個專家
      const nextIndex = (currentIndex + 1) % playersArray.length;
      this.currentExpertId = playersArray[nextIndex];
      
      // 如果回到第一個玩家，增加回合數
      if (nextIndex === 0) {
        this.round++;
      }
    }

    // 檢查遊戲是否結束
    if (this.round > playersArray.length) {
      this.gamePhase = 'finished';
      return true; // 遊戲結束
    }

    this.startNewRound();
    return false; // 遊戲繼續
  }

  getGameState() {
    const playersArray = Array.from(this.players.values());
    const expertPlayer = this.gamePhase === 'playing' ? 
      this.players.get(this.currentExpertId) : null;

    return {
      gamePhase: this.gamePhase,
      players: playersArray,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      roomLeader: this.roomLeader,
      round: this.round,
      currentExpert: expertPlayer,
      currentCategory: this.currentCategory,
      hints: this.hints,
      guessAttempts: this.guessAttempts,
      maxGuessAttempts: this.maxGuessAttempts,
      disconnectedCount: this.disconnectedPlayers.size
    };
  }

  restartGame() {
    // 重置遊戲狀態但保留玩家
    this.gamePhase = 'waiting';
    this.round = 1;
    this.currentExpertId = null;
    this.currentTopic = '';
    this.currentCategory = '';
    this.hints = [];
    this.guessAttempts = 0;

    // 重置所有玩家的準備狀態和分數
    for (let player of this.players.values()) {
      player.ready = false;
      player.score = 0;
    }

    // 將斷線玩家移回並重置
    for (let [nickname, player] of this.disconnectedPlayers) {
      player.ready = false;
      player.score = 0;
      player.connected = false; // 保持斷線狀態
    }
  }
}

// 全域遊戲狀態和聊天管理器
const gameState = new GameState();
const chatManager = new ChatManager();

// Socket.IO 連接處理
io.on('connection', (socket) => {
  console.log(`玩家連接: ${socket.id}`);

  // 發送歷史聊天記錄
  socket.emit('chat-history', chatManager.getRecentMessages());
  
  // 立即發送當前遊戲狀態，讓新連接的用戶能看到即時資訊
  socket.emit('game-state-update', gameState.getGameState());

  // 玩家加入遊戲
  socket.on('join-game', (nickname) => {
    const result = gameState.addPlayer(socket.id, nickname);
    
    if (result.success) {
      socket.emit('join-success', {
        player: result.player,
        isRoomLeader: gameState.roomLeader === socket.id,
        isReconnect: result.isReconnect
      });
      
      // 廣播更新遊戲狀態
      io.emit('game-state-update', gameState.getGameState());
      
      // 添加系統訊息
      const messageText = result.isReconnect ? 
        `${nickname} 重新連接了遊戲` : 
        `${nickname} 加入了遊戲`;
      const systemMessage = chatManager.addSystemMessage(messageText);
      io.emit('chat-message', systemMessage);
      
      console.log(`玩家 ${nickname} ${result.isReconnect ? '重新連接' : '加入遊戲'}`);
      
      // 如果是重連且遊戲正在進行，發送當前答案
      if (result.isReconnect && gameState.gamePhase === 'playing') {
        const expertId = gameState.currentExpertId;
        if (socket.id !== expertId) {
          socket.emit('answer-for-hint', {
            answer: gameState.currentTopic,
            category: gameState.currentCategory
          });
        }
      }
    } else {
      socket.emit('join-error', result.message);
    }
  });

  // 聊天訊息
  socket.on('chat-message', (messageData) => {
    const player = gameState.players.get(socket.id);
    if (player) {
      const chatMessage = chatManager.addMessage(
        socket.id, 
        player.nickname, 
        messageData.message
      );
      
      // 廣播聊天訊息給所有人
      io.emit('chat-message', chatMessage);
    }
  });

  // 切換準備狀態
  socket.on('toggle-ready', () => {
    const ready = gameState.togglePlayerReady(socket.id);
    io.emit('game-state-update', gameState.getGameState());
  });

  // 開始遊戲
  socket.on('start-game', () => {
    if (gameState.roomLeader === socket.id) {
      if (gameState.startGame()) {
        const gameMessage = chatManager.addGameMessage('遊戲開始！所有人輪流當專家');
        io.emit('chat-message', gameMessage);
        io.emit('game-started', gameState.getGameState());
        console.log('遊戲開始');
      } else {
        socket.emit('start-game-error', '無法開始遊戲');
      }
    }
  });

  // 提交提示
  socket.on('submit-hint', (hint) => {
    if (gameState.addHint(socket.id, hint)) {
      const player = gameState.players.get(socket.id);
      const gameMessage = chatManager.addGameMessage(`${player.nickname} 提交了提示`);
      io.emit('chat-message', gameMessage);
      
      io.emit('hint-added', {
        hint: {
          playerId: socket.id,
          playerName: gameState.players.get(socket.id).nickname,
          hint: hint
        },
        gameState: gameState.getGameState()
      });
    } else {
      socket.emit('hint-error', '無法提交提示');
    }
  });

  // 猜測答案
  socket.on('make-guess', (guess) => {
    const result = gameState.makeGuess(socket.id, guess);
    
    if (result.success) {
      const player = gameState.players.get(socket.id);
      let gameMessage;
      
      if (result.correct) {
        gameMessage = chatManager.addGameMessage(`🎉 ${player.nickname} 猜對了！答案是：${result.answer}`);
      } else if (result.answer) {
        gameMessage = chatManager.addGameMessage(`❌ ${player.nickname} 沒猜對，答案是：${result.answer}`);
      } else {
        gameMessage = chatManager.addGameMessage(`❌ ${player.nickname} 猜測：${guess}，繼續嘗試！`);
      }
      
      io.emit('chat-message', gameMessage);
      
      io.emit('guess-result', {
        correct: result.correct,
        answer: result.answer,
        message: result.message,
        gameState: gameState.getGameState()
      });

      // 如果猜對了或用完機會，進入下一回合
      if (result.correct || result.answer) {
        setTimeout(() => {
          const gameEnded = gameState.nextExpert();
          
          if (gameEnded) {
            const endMessage = chatManager.addGameMessage('🏆 遊戲結束！查看最終排名');
            io.emit('chat-message', endMessage);
            io.emit('game-ended', gameState.getGameState());
          } else {
            const nextExpert = gameState.players.get(gameState.currentExpertId);
            if (nextExpert) {
              const nextMessage = chatManager.addGameMessage(`下一回合：${nextExpert.nickname} 當專家`);
              io.emit('chat-message', nextMessage);
              io.emit('next-round', gameState.getGameState());
            }
          }
        }, 3000);
      }
    } else {
      socket.emit('guess-error', result.message);
    }
  });

  // 重新開始遊戲
  socket.on('restart-game', () => {
    if (gameState.roomLeader === socket.id) {
      gameState.restartGame();
      const restartMessage = chatManager.addSystemMessage('🔄 遊戲重置，準備開始新的一局！');
      io.emit('chat-message', restartMessage);
      io.emit('game-restarted', gameState.getGameState());
    }
  });

  // 獲取當前答案（僅提示者可見）
  socket.on('get-answer', () => {
    const expertId = gameState.currentExpertId;
    
    if (socket.id !== expertId && gameState.gamePhase === 'playing') {
      socket.emit('answer-for-hint', {
        answer: gameState.currentTopic,
        category: gameState.currentCategory
      });
    }
  });

  // 玩家斷線
  socket.on('disconnect', () => {
    const player = gameState.players.get(socket.id);
    const removed = gameState.removePlayer(socket.id);
    
    if (removed && player) {
      const disconnectMessage = gameState.gamePhase === 'playing' ? 
        chatManager.addSystemMessage(`${player.nickname} 暫時離線（30秒內可重連）`) :
        chatManager.addSystemMessage(`${player.nickname} 離開了遊戲`);
      io.emit('chat-message', disconnectMessage);
      
      io.emit('player-disconnected', {
        playerId: socket.id,
        gameState: gameState.getGameState()
      });
      console.log(`玩家斷線: ${socket.id} (${player.nickname})`);
    }
  });
});

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', players: gameState.players.size });
});

app.get('/api/game-state', (req, res) => {
  res.json(gameState.getGameState());
});

app.get('/api/chat-history', (req, res) => {
  res.json(chatManager.getRecentMessages());
});

// 啟動伺服器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
  console.log(`🎮 遊戲準備就緒！`);
  console.log(`💬 聊天功能已啟用！`);
});