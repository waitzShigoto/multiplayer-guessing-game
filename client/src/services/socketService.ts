import io, { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../constants/game';

class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(process.env.NODE_ENV === 'production' 
      ? process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'
      : 'http://localhost:3001'
    );
  }

  getSocket(): Socket {
    return this.socket;
  }

  // 遊戲相關方法
  joinGame(nickname: string): void {
    this.socket.emit(SOCKET_EVENTS.JOIN_GAME, nickname);
  }

  toggleReady(): void {
    this.socket.emit(SOCKET_EVENTS.TOGGLE_READY);
  }

  startGame(): void {
    this.socket.emit(SOCKET_EVENTS.START_GAME);
  }

  submitHint(hint: string): void {
    this.socket.emit(SOCKET_EVENTS.SUBMIT_HINT, hint);
  }

  makeGuess(guess: string): void {
    this.socket.emit(SOCKET_EVENTS.MAKE_GUESS, guess);
  }

  restartGame(): void {
    this.socket.emit(SOCKET_EVENTS.RESTART_GAME);
  }

  getAnswer(): void {
    this.socket.emit(SOCKET_EVENTS.GET_ANSWER);
  }

  sendChatMessage(message: string): void {
    this.socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, { message });
  }

  // 事件監聽器
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket.off(event, callback);
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

export const socketService = new SocketService(); 