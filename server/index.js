const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
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
    this.players = new Map();
    this.gamePhase = 'waiting'; // waiting, playing, finished
    this.currentExpert = 0;
    this.round = 1;
    this.currentTopic = '';
    this.currentCategory = '';
    this.hints = [];
    this.roomLeader = null;
    this.maxPlayers = parseInt(process.env.MAX_PLAYERS) || 8;
    this.minPlayers = parseInt(process.env.MIN_PLAYERS) || 3;
    this.guessAttempts = 0;
    this.maxGuessAttempts = parseInt(process.env.MAX_GUESS_ATTEMPTS) || 3;
    
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
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: '房間已滿' };
    }

    // 檢查暱稱是否重複
    for (let player of this.players.values()) {
      if (player.nickname === nickname) {
        return { success: false, message: '暱稱已被使用' };
      }
    }

    const player = {
      id: socketId,
      nickname,
      ready: false,
      score: 0,
      connected: true
    };

    this.players.set(socketId, player);

    // 設定第一個玩家為室長
    if (this.players.size === 1) {
      this.roomLeader = socketId;
    }

    return { success: true, player };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return false;

    this.players.delete(socketId);

    // 如果室長離開，選擇新室長
    if (this.roomLeader === socketId && this.players.size > 0) {
      this.roomLeader = this.players.keys().next().value;
    }

    // 如果當前專家離開，跳到下一個
    if (this.gamePhase === 'playing') {
      const playersArray = Array.from(this.players.keys());
      const expertId = playersArray[this.currentExpert];
      if (expertId === socketId) {
        this.nextExpert();
      }
    }

    return true;
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
    this.currentExpert = 0;
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
    const playersArray = Array.from(this.players.keys());
    const expertId = playersArray[this.currentExpert];
    
    // 專家不能給提示
    if (socketId === expertId) return false;
    
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
    const playersArray = Array.from(this.players.keys());
    const expertId = playersArray[this.currentExpert];
    
    // 只有專家可以猜測
    if (socketId !== expertId) return { success: false, message: '只有專家可以猜測' };

    this.guessAttempts++;
    const isCorrect = guess.toLowerCase().trim() === this.currentTopic.toLowerCase().trim();

    if (isCorrect) {
      // 專家得分
      const expert = this.players.get(expertId);
      expert.score += 10;

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
    this.currentExpert = (this.currentExpert + 1) % playersArray.length;
    
    if (this.currentExpert === 0) {
      this.round++;
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
      playersArray[this.currentExpert] : null;

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
      maxGuessAttempts: this.maxGuessAttempts
    };
  }

  restartGame() {
    this.gamePhase = 'waiting';
    this.round = 1;
    this.currentExpert = 0;
    this.hints = [];
    this.guessAttempts = 0;
    this.currentTopic = '';
    this.currentCategory = '';

    // 重置玩家狀態
    for (let player of this.players.values()) {
      player.ready = false;
      player.score = 0;
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

  // 玩家加入遊戲
  socket.on('join-game', (nickname) => {
    const result = gameState.addPlayer(socket.id, nickname);
    
    if (result.success) {
      socket.emit('join-success', {
        player: result.player,
        isRoomLeader: gameState.roomLeader === socket.id
      });
      
      // 廣播更新遊戲狀態
      io.emit('game-state-update', gameState.getGameState());
      
      // 添加系統訊息
      const systemMessage = chatManager.addSystemMessage(`${nickname} 加入了遊戲`);
      io.emit('chat-message', systemMessage);
      
      console.log(`玩家 ${nickname} 加入遊戲`);
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
            const nextExpert = gameState.players.get(Array.from(gameState.players.keys())[gameState.currentExpert]);
            const nextMessage = chatManager.addGameMessage(`下一回合：${nextExpert.nickname} 當專家`);
            io.emit('chat-message', nextMessage);
            io.emit('next-round', gameState.getGameState());
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
    const playersArray = Array.from(gameState.players.keys());
    const expertId = playersArray[gameState.currentExpert];
    
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
      const disconnectMessage = chatManager.addSystemMessage(`${player.nickname} 離開了遊戲`);
      io.emit('chat-message', disconnectMessage);
      
      io.emit('player-disconnected', {
        playerId: socket.id,
        gameState: gameState.getGameState()
      });
      console.log(`玩家斷線: ${socket.id}`);
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