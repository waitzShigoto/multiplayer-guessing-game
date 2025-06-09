import React from 'react';
import styled from 'styled-components';

interface InputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
  disabled?: boolean;
}

const StyledInput = styled.input`
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

  &:disabled {
    background-color: #f8f9fa;
    color: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const Input: React.FC<InputProps> = (props) => {
  return <StyledInput {...props} />;
}; 