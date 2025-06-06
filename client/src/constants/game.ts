export const GAME_CONFIG = {
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 3,
  MAX_GUESS_ATTEMPTS: 3,
  NICKNAME_MAX_LENGTH: 20,
  MESSAGE_DISPLAY_TIME: 3000,
  RECONNECT_TIMEOUT: 30000,
} as const;

export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_GAME: 'join-game',
  TOGGLE_READY: 'toggle-ready',
  START_GAME: 'start-game',
  SUBMIT_HINT: 'submit-hint',
  MAKE_GUESS: 'make-guess',
  RESTART_GAME: 'restart-game',
  GET_ANSWER: 'get-answer',
  CHAT_MESSAGE: 'chat-message',
  
  // Server to Client
  JOIN_SUCCESS: 'join-success',
  JOIN_ERROR: 'join-error',
  GAME_STATE_UPDATE: 'game-state-update',
  GAME_STARTED: 'game-started',
  HINT_ADDED: 'hint-added',
  GUESS_RESULT: 'guess-result',
  NEXT_ROUND: 'next-round',
  GAME_ENDED: 'game-ended',
  GAME_RESTARTED: 'game-restarted',
  ANSWER_FOR_HINT: 'answer-for-hint',
  PLAYER_DISCONNECTED: 'player-disconnected',
} as const; 