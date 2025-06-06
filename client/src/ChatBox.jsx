import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

// 聊天容器樣式
const ChatContainer = styled.div`
  background: white;
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: 600px;
  margin-bottom: 20px;
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  border-radius: 15px 15px 0 0;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background: #f8f9fa;
  
  /* 自定義滾動條 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const ChatMessage = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  word-wrap: break-word;
  
  ${props => {
    switch(props.type) {
      case 'system':
        return `
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          color: #1565c0;
          font-style: italic;
        `;
      case 'game':
        return `
          background: #f3e5f5;
          border-left: 4px solid #9c27b0;
          color: #7b1fa2;
          font-weight: 500;
        `;
      default:
        return `
          background: white;
          border: 1px solid #e9ecef;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        `;
    }
  }}
`;

const MessageHeader = styled.div`
  font-size: 0.85em;
  color: #666;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MessageContent = styled.div`
  font-size: 0.95em;
  line-height: 1.4;
`;

const ChatInput = styled.div`
  padding: 15px;
  border-top: 1px solid #e9ecef;
  background: white;
  border-radius: 0 0 15px 15px;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &::placeholder {
    color: #999;
  }
`;

const SendButton = styled.button`
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const OnlineIndicator = styled.div`
  width: 8px;
  height: 8px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const ChatBox = ({ socket, currentPlayer, gamePhase }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // 滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket 事件監聽
  useEffect(() => {
    if (!socket) return;

    // 連接狀態
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // 聊天事件
    const handleChatHistory = (history) => {
      setMessages(history);
    };

    const handleChatMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    // 註冊事件監聽器
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat-history', handleChatHistory);
    socket.on('chat-message', handleChatMessage);

    // 檢查初始連接狀態
    setIsConnected(socket.connected);

    // 清理函數
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat-history', handleChatHistory);
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket]);

  // 發送訊息
  const sendMessage = () => {
    if (!inputMessage.trim() || !currentPlayer || !socket) return;

    socket.emit('chat-message', {
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  // 按 Enter 發送訊息
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 格式化時間
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 渲染訊息
  const renderMessage = (message) => {
    const isSystemOrGame = message.type === 'system' || message.type === 'game';
    
    return (
      <ChatMessage key={message.id} type={message.type}>
        {!isSystemOrGame && (
          <MessageHeader>
            <span style={{ fontWeight: 'bold', color: '#333' }}>
              {message.playerName}
            </span>
            <span>{formatTime(message.timestamp)}</span>
          </MessageHeader>
        )}
        <MessageContent>
          {isSystemOrGame && (
            <strong>
              {message.type === 'system' ? '📢 ' : '🎮 '}
            </strong>
          )}
          {message.message}
          {isSystemOrGame && (
            <span style={{ fontSize: '0.8em', marginLeft: '10px', opacity: 0.7 }}>
              {formatTime(message.timestamp)}
            </span>
          )}
        </MessageContent>
      </ChatMessage>
    );
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <OnlineIndicator />
        💬 聊天室
        <span style={{ fontSize: '0.9em', opacity: 0.9 }}>
          ({messages.filter(m => m.type === 'chat').length} 條訊息)
        </span>
      </ChatHeader>

      <ChatMessages>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#999', 
            padding: '40px 20px',
            fontStyle: 'italic'
          }}>
            💭 還沒有訊息，開始聊天吧！
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </ChatMessages>

      <ChatInput>
        <InputGroup>
          <MessageInput
            type="text"
            placeholder={
              !currentPlayer 
                ? "請先加入遊戲才能聊天..." 
                : "輸入訊息... (按 Enter 發送)"
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!currentPlayer || !isConnected}
            maxLength={200}
          />
          <SendButton
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !currentPlayer || !isConnected}
            title={!isConnected ? "連接中..." : "發送訊息"}
          >
            {!isConnected ? "📡" : "發送"}
          </SendButton>
        </InputGroup>
        {inputMessage.length > 150 && (
          <div style={{ 
            fontSize: '0.8em', 
            color: '#666', 
            marginTop: '5px',
            textAlign: 'right'
          }}>
            {inputMessage.length}/200
          </div>
        )}
      </ChatInput>
    </ChatContainer>
  );
};

export default ChatBox;
