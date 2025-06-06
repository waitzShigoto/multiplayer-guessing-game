import React, { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import styled from 'styled-components';
import ChatBox from './ChatBox';

// 類型定義
interface Player {
  id: string;
  nickname: string;
  ready: boolean;
  score: number;
  connected: boolean;
}

interface Hint {
  playerId: string;
  playerName: string;
  hint: string;
}

interface GameState {
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
  disconnectedCount?: number; // 斷線玩家數量（可選，向後兼容）
}

interface Message {
  id: number;
  text: string;
  isError: boolean;
}

// Socket 連接 - 修改端口為 3001
const socket: Socket = io('http://localhost:3001');

// 樣式組件
const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 20px;
  gap: 20px;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }
`;

const GameContainer = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 800px;
  padding: 30px;
  animation: slideIn 0.5s ease-out;

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ChatContainer = styled.div`
  width: 100%;
  max-width: 400px;
  
  @media (max-width: 1200px) {
    max-width: 800px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;

  h1 {
    color: #667eea;
    font-size: 2.5em;
    margin-bottom: 10px;
  }
`;

const StatusBar = styled.div`
  background: #f8f9fa;
  border-radius: 15px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PlayersContainer = styled.div`
  background: #f8f9fa;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
`;

const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
`;

interface PlayerCardProps {
  isExpert?: boolean;
  isRoomLeader?: boolean;
  isCurrentPlayer?: boolean;
}

const PlayerCard = styled.div<PlayerCardProps>`
  background: white;
  border-radius: 10px;
  padding: 15px;
  text-align: center;
  transition: all 0.3s ease;
  border: 2px solid #e9ecef;
  position: relative;

  ${props => props.isExpert && `
    border-color: #ffd700;
    background: linear-gradient(135deg, #fff9c4 0%, #fff3a0 100%);
    transform: scale(1.05);
  `}

  ${props => props.isRoomLeader && `
    border-color: #dc3545;
  `}

  ${props => props.isCurrentPlayer && `
    border-color: #667eea;
    border-width: 3px;
    box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
    
    &::before {
      content: '👤 你';
      position: absolute;
      top: -8px;
      right: -8px;
      background: #667eea;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: bold;
    }
  `}
`;

const GameArea = styled.div`
  background: #f8f9fa;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  min-height: 300px;
`;

const InputArea = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  flex: 1;
  padding: 15px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

interface ButtonProps {
  primary?: boolean;
  success?: boolean;
  danger?: boolean;
}

const Button = styled.button<ButtonProps>`
  padding: 15px 25px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  ${props => props.primary && `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
  `}

  ${props => props.success && `
    background: #28a745;
    color: white;
  `}

  ${props => props.danger && `
    background: #dc3545;
    color: white;
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface MessageProps {
  error?: boolean;
}

const MessageComponent = styled.div<MessageProps>`
  background: ${props => props.error ? '#f8d7da' : '#d4edda'};
  border: 1px solid ${props => props.error ? '#f5c6cb' : '#c3e6cb'};
  color: ${props => props.error ? '#721c24' : '#155724'};
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 15px;
`;

const HintsContainer = styled.div`
  background: white;
  border-radius: 10px;
  padding: 15px;
  margin-top: 15px;
`;

const HintItem = styled.div`
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 0 5px 5px 0;
`;

const Controls = styled.div`
  text-align: center;
  margin-top: 20px;

  button {
    margin: 0 10px;
  }
`;

const App: React.FC = () => {
  // 狀態管理
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'waiting',
    players: [],
    playerCount: 0,
    maxPlayers: 8,
    roomLeader: null,
    round: 1,
    currentExpert: null,
    currentCategory: '',
    hints: [],
    guessAttempts: 0,
    maxGuessAttempts: 3
  });

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [hintInput, setHintInput] = useState<string>('');
  const [guessInput, setGuessInput] = useState<string>('');
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasSubmittedHint, setHasSubmittedHint] = useState<boolean>(false);

  // 隨機名稱生成器
  const generateRandomNickname = (): string => {
    const adjectives = [
      '聰明的', '勇敢的', '可愛的', '神秘的', '快樂的', '冷靜的', '活潑的', '溫柔的',
      '機智的', '幽默的', '優雅的', '堅強的', '善良的', '創意的', '熱情的', '淡定的',
      '靈巧的', '開朗的', '專注的', '友善的', '樂觀的', '細心的', '大膽的', '謙虛的'
    ];
    
    const nouns = [
      '小貓', '小狗', '小熊', '小兔', '小鳥', '小魚', '小龍', '小虎',
      '獅子', '大象', '熊貓', '企鵝', '海豚', '獨角獸', '鳳凰', '麒麟',
      '忍者', '騎士', '法師', '戰士', '弓箭手', '盜賊', '學者', '探險家',
      '星星', '月亮', '太陽', '彩虹', '閃電', '雲朵', '雪花', '花朵'
    ];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${randomAdjective}${randomNoun}`;
  };

  // 處理隨機名稱生成
  const handleGenerateNickname = (): void => {
    const randomName = generateRandomNickname();
    setNickname(randomName);
    addMessage(`🎲 隨機生成名稱：${randomName}`, false);
  };

  // 使用 useCallback 來穩定 resetRoundState 函數
  const resetRoundState = useCallback((): void => {
    setHasSubmittedHint(false);
    setHintInput('');
    setGuessInput('');
    setCurrentAnswer('');
    
    // 請求答案（如果不是專家）
    if (gameState.gamePhase === 'playing' && currentPlayer && 
        gameState.currentExpert?.id !== currentPlayer.id) {
      socket.emit('get-answer');
    }
  }, [gameState.gamePhase, gameState.currentExpert?.id, currentPlayer]);

  // 工具函數
  const addMessage = useCallback((text: string, isError: boolean = false): void => {
    const message: Message = { id: Date.now(), text, isError };
    setMessages(prev => [...prev, message]);
    
    // 3秒後自動移除訊息
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== message.id));
    }, 3000);
  }, []);

  // Socket 事件監聽
  useEffect(() => {
    socket.on('join-success', (data: { player: Player; isRoomLeader: boolean }) => {
      setCurrentPlayer(data.player);
      addMessage(`歡迎 ${data.player.nickname}！`, false);
    });

    socket.on('join-error', (error: string) => {
      addMessage(error, true);
    });

    socket.on('game-state-update', (newGameState: GameState) => {
      setGameState(newGameState);
    });

    socket.on('game-started', (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('遊戲開始！', false);
      resetRoundState();
    });

    socket.on('hint-added', (data: { hint: Hint; gameState: GameState }) => {
      setGameState(data.gameState);
      if (data.hint.playerId === currentPlayer?.id) {
        setHasSubmittedHint(true);
        addMessage('提示已提交！', false);
      }
    });

    socket.on('guess-result', (data: { 
      correct: boolean; 
      answer: string | null; 
      message: string; 
      gameState: GameState 
    }) => {
      addMessage(data.message, !data.correct);
      setGameState(data.gameState);
      
      if (data.answer) {
        setGuessInput('');
      }
    });

    socket.on('next-round', (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('開始新回合！', false);
      resetRoundState();
    });

    socket.on('game-ended', (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('遊戲結束！', false);
    });

    socket.on('game-restarted', (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('遊戲重置，準備開始新的一局！', false);
      resetRoundState();
    });

    socket.on('answer-for-hint', (data: { answer: string; category: string }) => {
      setCurrentAnswer(data.answer);
    });

    socket.on('player-disconnected', (data: { playerId: string; gameState: GameState }) => {
      setGameState(data.gameState);
    });

    return () => {
      socket.off('join-success');
      socket.off('join-error');
      socket.off('game-state-update');
      socket.off('game-started');
      socket.off('hint-added');
      socket.off('guess-result');
      socket.off('next-round');
      socket.off('game-ended');
      socket.off('game-restarted');
      socket.off('answer-for-hint');
      socket.off('player-disconnected');
    };
  }, [currentPlayer, addMessage, resetRoundState]);

  // 監聽遊戲狀態變化，更新答案
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && currentPlayer && 
        gameState.currentExpert?.id !== currentPlayer.id) {
      socket.emit('get-answer');
    }
  }, [gameState.currentExpert, gameState.gamePhase, currentPlayer]);

  // 事件處理函數
  const handleJoinGame = (): void => {
    if (!nickname.trim()) {
      addMessage('請輸入暱稱', true);
      return;
    }
    socket.emit('join-game', nickname.trim());
  };

  const handleToggleReady = (): void => {
    socket.emit('toggle-ready');
  };

  const handleStartGame = (): void => {
    socket.emit('start-game');
  };

  const handleSubmitHint = (): void => {
    if (!hintInput.trim()) {
      addMessage('請輸入提示', true);
      return;
    }
    socket.emit('submit-hint', hintInput.trim());
  };

  const handleMakeGuess = (): void => {
    if (!guessInput.trim()) {
      addMessage('請輸入猜測', true);
      return;
    }
    socket.emit('make-guess', guessInput.trim());
  };

  const handleRestartGame = (): void => {
    socket.emit('restart-game');
  };

  // 鍵盤事件處理
  const handleKeyPress = (e: React.KeyboardEvent, action: () => void): void => {
    if (e.key === 'Enter') {
      action();
    }
  };

  // 檢查是否為專家
  const isCurrentPlayerExpert = (): boolean => {
    return Boolean(currentPlayer && gameState.currentExpert?.id === currentPlayer.id);
  };

  // 檢查是否為室長
  const isCurrentPlayerRoomLeader = (): boolean => {
    return Boolean(currentPlayer && gameState.roomLeader === currentPlayer.id);
  };

  // 檢查是否所有人都提交了提示
  const allHintsSubmitted = (): boolean => {
    return gameState.hints.length === gameState.players.length - 1;
  };

  // 渲染玩家列表
  const renderPlayerList = (): JSX.Element[] => {
    return gameState.players.map((player) => (
      <PlayerCard
        key={player.id}
        isExpert={gameState.gamePhase === 'playing' && gameState.currentExpert?.id === player.id}
        isRoomLeader={gameState.roomLeader === player.id}
        isCurrentPlayer={currentPlayer?.id === player.id}
      >
        <div style={{ fontWeight: 'bold' }}>{player.nickname}</div>
        <div style={{ fontSize: '0.9em', color: '#666', margin: '5px 0' }}>
          {gameState.roomLeader === player.id && '👑 室長 '}
          {gameState.gamePhase === 'playing' && gameState.currentExpert?.id === player.id && '🎯 專家 '}
          {gameState.gamePhase === 'waiting' && (player.ready ? '✅ 準備' : '⏳ 未準備')}
          {currentPlayer?.id === player.id && '🔵 你'}
        </div>
        <div style={{ fontWeight: 'bold', color: '#667eea' }}>得分: {player.score}</div>
      </PlayerCard>
    ));
  };

  // 渲染提示列表
  const renderHints = (): JSX.Element[] => {
    return gameState.hints.map((hint, index) => (
      <HintItem key={index}>
        <strong>{hint.playerName}:</strong> {hint.hint}
      </HintItem>
    ));
  };

  // 渲染歡迎畫面
  const renderWelcomeScreen = (): JSX.Element => (
    <GameArea>
      <div style={{ textAlign: 'center' }}>
        <h3>🎮 歡迎來到多人輪流猜字遊戲！</h3>
        <p>請輸入你的暱稱來加入遊戲。第一位加入的玩家將成為室長。</p>
        <InputArea>
          <Input
            type="text"
            placeholder="輸入你的暱稱..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleJoinGame)}
            maxLength={20}
          />
          <Button 
            style={{ 
              minWidth: '50px',
              padding: '15px 12px',
              background: '#f8f9fa',
              border: '2px solid #e9ecef',
              color: '#495057',
              fontSize: '18px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e9ecef';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8f9fa';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onClick={handleGenerateNickname}
            title="隨機生成名稱"
          >
            🎲
          </Button>
          <Button primary onClick={handleJoinGame}>
            加入遊戲
          </Button>
        </InputArea>
        <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
          💡 點擊骰子可以隨機生成有趣的名稱
        </p>
      </div>
    </GameArea>
  );

  // 渲染等待畫面
  const renderWaitingScreen = (): JSX.Element => (
    <GameArea>
      <div style={{ textAlign: 'center' }}>
        <h3>等待其他玩家...</h3>
        <p>室長可以在所有人準備好後開始遊戲。需要至少3人才能開始。</p>
        <Controls>
          {isCurrentPlayerRoomLeader() && (
            <Button 
              success 
              onClick={handleStartGame}
              disabled={!gameState.players.every(p => p.ready) || gameState.players.length < 3}
            >
              開始遊戲
            </Button>
          )}
          <Button primary onClick={handleToggleReady}>
            {currentPlayer?.ready ? '取消準備' : '準備'}
          </Button>
        </Controls>
        {gameState.players.length < 3 && (
          <p style={{ color: '#dc3545', marginTop: '15px' }}>
            還需要 {3 - gameState.players.length} 人才能開始遊戲
          </p>
        )}
      </div>
    </GameArea>
  );

  // 渲染遊戲畫面
  const renderGameScreen = (): JSX.Element => {
    const isExpert = isCurrentPlayerExpert();

    return (
      <GameArea>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3>
            第 {gameState.round} 回合 - {gameState.currentExpert?.nickname} 是專家
          </h3>
          <p>類別：<strong>{gameState.currentCategory}</strong></p>
        </div>

        {isExpert ? (
          // 專家視角
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h4>🎯 你是本回合的專家！</h4>
              <p>等待其他玩家給你提示...</p>
            </div>

            <HintsContainer>
              <h5>收到的提示：</h5>
              {gameState.hints.length > 0 ? renderHints() : <p>還沒有收到提示</p>}
            </HintsContainer>

            {allHintsSubmitted() && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <InputArea>
                  <Input
                    type="text"
                    placeholder="輸入你的猜測..."
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleMakeGuess)}
                  />
                  <Button primary onClick={handleMakeGuess}>
                    猜測
                  </Button>
                </InputArea>
                <p style={{ marginTop: '10px' }}>
                  剩餘猜測次數：{gameState.maxGuessAttempts - gameState.guessAttempts}
                </p>
              </div>
            )}
          </div>
        ) : (
          // 其他玩家視角
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h4>💡 給專家一個提示</h4>
              {currentAnswer && (
                <p>
                  答案是：<strong style={{ color: '#dc3545' }}>{currentAnswer}</strong>
                </p>
              )}
            </div>

            {!hasSubmittedHint ? (
              <InputArea>
                <Input
                  type="text"
                  placeholder="輸入你的提示（不要太明顯哦）..."
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleSubmitHint)}
                />
                <Button primary onClick={handleSubmitHint}>
                  提交提示
                </Button>
              </InputArea>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', background: '#d4edda', borderRadius: '10px' }}>
                <p>✅ 你已經提交了提示，等待其他玩家...</p>
              </div>
            )}

            <HintsContainer>
              <h5>已提交的提示：</h5>
              {gameState.hints.length > 0 ? renderHints() : <p>還沒有人提交提示</p>}
            </HintsContainer>
          </div>
        )}
      </GameArea>
    );
  };

  // 渲染結束畫面
  const renderEndScreen = (): JSX.Element => {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    return (
      <GameArea>
        <div style={{ textAlign: 'center' }}>
          <h3>🏆 遊戲結束！</h3>
          <h4>最終排名：</h4>
          <div style={{ margin: '20px 0' }}>
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                style={{
                  margin: '10px 0',
                  padding: '15px',
                  background: index === 0 ? '#ffd700' : '#f8f9fa',
                  borderRadius: '10px',
                  fontSize: '1.1em'
                }}
              >
                {index + 1}. {player.nickname} - {player.score} 分
                {index === 0 && ' 🥇'}
                {index === 1 && ' 🥈'}
                {index === 2 && ' 🥉'}
              </div>
            ))}
          </div>
          {isCurrentPlayerRoomLeader() && (
            <Button primary onClick={handleRestartGame}>
              再玩一局
            </Button>
          )}
        </div>
      </GameArea>
    );
  };

  // 主渲染
  return (
    <AppContainer>
      <GameContainer>
        <Header>
          <h1>🎮 多人輪流猜字遊戲</h1>
          <p>最多8人同樂，輪流當專家！</p>
        </Header>

        <StatusBar>
          <div>
            <strong>遊戲狀態：</strong>
            <span>
              {gameState.gamePhase === 'waiting' && '等待玩家加入'}
              {gameState.gamePhase === 'playing' && '遊戲進行中'}
              {gameState.gamePhase === 'finished' && '遊戲結束'}
            </span>
          </div>
          <div>
            <strong>玩家人數：</strong>
            <span>{gameState.playerCount}/{gameState.maxPlayers}</span>
            {gameState.disconnectedCount && gameState.disconnectedCount > 0 && (
              <span style={{ color: '#dc3545', marginLeft: '10px' }}>
                (斷線: {gameState.disconnectedCount})
              </span>
            )}
          </div>
        </StatusBar>

        {gameState.players.length > 0 && (
          <PlayersContainer>
            <h3>🧑‍🤝‍🧑 玩家列表</h3>
            <PlayerGrid>{renderPlayerList()}</PlayerGrid>
          </PlayersContainer>
        )}

        {/* 遊戲內容區域 */}
        {!currentPlayer && renderWelcomeScreen()}
        {currentPlayer && gameState.gamePhase === 'waiting' && renderWaitingScreen()}
        {currentPlayer && gameState.gamePhase === 'playing' && renderGameScreen()}
        {currentPlayer && gameState.gamePhase === 'finished' && renderEndScreen()}

        {/* 訊息區域 */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          {messages.map((message) => (
            <MessageComponent key={message.id} error={message.isError}>
              {message.text}
            </MessageComponent>
          ))}
        </div>
      </GameContainer>

      {/* 聊天區域 */}
      <ChatContainer>
        <ChatBox 
          socket={socket} 
          currentPlayer={currentPlayer}
          gamePhase={gameState.gamePhase}
        />
      </ChatContainer>
    </AppContainer>
  );
};

export default App;