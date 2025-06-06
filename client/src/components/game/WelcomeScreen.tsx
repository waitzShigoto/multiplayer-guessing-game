import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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

interface WelcomeScreenProps {
  nickname: string;
  setNickname: (nickname: string) => void;
  onJoinGame: () => void;
  onGenerateNickname: () => void;
  onKeyPress: (e: React.KeyboardEvent, action: () => void) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  nickname,
  setNickname,
  onJoinGame,
  onGenerateNickname,
  onKeyPress
}) => {
  return (
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
            onKeyPress={(e) => onKeyPress(e, onJoinGame)}
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
            onClick={onGenerateNickname}
            title="隨機生成名稱"
          >
            🎲
          </Button>
          <Button primary onClick={onJoinGame}>
            加入遊戲
          </Button>
        </InputArea>
        <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
          💡 點擊骰子可以隨機生成有趣的名稱
        </p>
      </div>
    </GameArea>
  );
}; 