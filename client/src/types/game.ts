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
  disconnectedCount?: number;
}

export interface Message {
  id: number;
  text: string;
  isError: boolean;
} 