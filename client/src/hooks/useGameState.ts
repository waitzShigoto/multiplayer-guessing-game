import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Message } from '../types/game';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS, GAME_CONFIG } from '../constants/game';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'waiting',
    players: [],
    playerCount: 0,
    maxPlayers: GAME_CONFIG.MAX_PLAYERS,
    roomLeader: null,
    round: 1,
    currentExpert: null,
    currentCategory: '',
    hints: [],
    guessAttempts: 0,
    maxGuessAttempts: GAME_CONFIG.MAX_GUESS_ATTEMPTS
  });

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [hasSubmittedHint, setHasSubmittedHint] = useState<boolean>(false);

  const addMessage = useCallback((text: string, isError: boolean = false): void => {
    const message: Message = { id: Date.now(), text, isError };
    setMessages(prev => [...prev, message]);
    
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== message.id));
    }, GAME_CONFIG.MESSAGE_DISPLAY_TIME);
  }, []);

  const resetRoundState = useCallback((): void => {
    setHasSubmittedHint(false);
    setCurrentAnswer('');
    
    // 請求答案（如果不是專家）
    if (gameState.gamePhase === 'playing' && currentPlayer && 
        gameState.currentExpert?.id !== currentPlayer.id) {
      socketService.getAnswer();
    }
  }, [gameState.gamePhase, gameState.currentExpert?.id, currentPlayer]);

  useEffect(() => {
    const socket = socketService.getSocket();

    // 監聽遊戲狀態更新
    socket.on(SOCKET_EVENTS.JOIN_SUCCESS, (data: { player: Player; isRoomLeader: boolean }) => {
      setCurrentPlayer(data.player);
      addMessage(`歡迎 ${data.player.nickname}！`, false);
    });

    socket.on(SOCKET_EVENTS.JOIN_ERROR, (error: string) => {
      addMessage(error, true);
    });

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (newGameState: GameState) => {
      setGameState(newGameState);
    });

    socket.on(SOCKET_EVENTS.GAME_STARTED, (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('遊戲開始！', false);
      resetRoundState();
    });

    socket.on(SOCKET_EVENTS.HINT_ADDED, (data: { hint: any; gameState: GameState }) => {
      setGameState(data.gameState);
      if (data.hint.playerId === currentPlayer?.id) {
        setHasSubmittedHint(true);
        addMessage('提示已提交！', false);
      }
    });

    socket.on(SOCKET_EVENTS.GUESS_RESULT, (data: { 
      correct: boolean; 
      answer: string | null; 
      message: string; 
      gameState: GameState 
    }) => {
      addMessage(data.message, !data.correct);
      setGameState(data.gameState);
    });

    socket.on(SOCKET_EVENTS.NEXT_ROUND, (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('開始新回合！', false);
      resetRoundState();
    });

    socket.on(SOCKET_EVENTS.GAME_ENDED, (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('遊戲結束！', false);
    });

    socket.on(SOCKET_EVENTS.GAME_RESTARTED, (newGameState: GameState) => {
      setGameState(newGameState);
      addMessage('遊戲重置，準備開始新的一局！', false);
      resetRoundState();
    });

    socket.on(SOCKET_EVENTS.ANSWER_FOR_HINT, (data: { answer: string; category: string }) => {
      setCurrentAnswer(data.answer);
    });

    socket.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, (data: { playerId: string; gameState: GameState }) => {
      setGameState(data.gameState);
    });

    return () => {
      socket.off(SOCKET_EVENTS.JOIN_SUCCESS);
      socket.off(SOCKET_EVENTS.JOIN_ERROR);
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_STARTED);
      socket.off(SOCKET_EVENTS.HINT_ADDED);
      socket.off(SOCKET_EVENTS.GUESS_RESULT);
      socket.off(SOCKET_EVENTS.NEXT_ROUND);
      socket.off(SOCKET_EVENTS.GAME_ENDED);
      socket.off(SOCKET_EVENTS.GAME_RESTARTED);
      socket.off(SOCKET_EVENTS.ANSWER_FOR_HINT);
      socket.off(SOCKET_EVENTS.PLAYER_DISCONNECTED);
    };
  }, [currentPlayer, addMessage, resetRoundState]);

  // 監聽遊戲狀態變化，更新答案
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && currentPlayer && 
        gameState.currentExpert?.id !== currentPlayer.id) {
      socketService.getAnswer();
    }
  }, [gameState.currentExpert, gameState.gamePhase, currentPlayer]);

  return {
    gameState,
    currentPlayer,
    messages,
    currentAnswer,
    hasSubmittedHint,
    addMessage,
    resetRoundState
  };
}; 