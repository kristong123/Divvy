import React, { useState } from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  background: white;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  gap: 12px;
`;

const GroupTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const GroupName = styled.h2`
  font-size: 18px;
  font-weight: bold;
  color: black;
`;

const Amount = styled.div`
  color: #666;
  font-size: 14px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  max-height: 100%;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #e0e0e0;
    border-radius: 4px;
  }
`;

const MessageInput = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid #e0e0e0;
  background: white;
  gap: 12px;
  margin-bottom: 0;
`;

const PlusButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(87, 227, 220), white);
  border: none;
  color: black;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  order: -1;
`;

const StyledInput = styled.input`
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 24px;
  background: #f0f0f0;
  color: black;
  
  &::placeholder {
    color: #666;
  }

  &:focus {
    outline: none;
    background: #e8e8e8;
  }
`;

const MessageBubble = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 8px 0;
`;

const MessageContent = styled.div`
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 70%;
  color: black;
`;

const MessageTime = styled.span`
  font-size: 12px;
  color: #666;
  margin-left: 8px;
`;

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: string;
}

interface GroupChatViewProps {
  group: {
    id: string;
    name: string;
    amount?: string;
  };
}

const GroupChatView: React.FC<GroupChatViewProps> = ({ group }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        timestamp: new Date(),
        sender: 'You'
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <GroupTitle>
          <GroupName>{group.name}</GroupName>
          {group.amount && <Amount>${group.amount}</Amount>}
        </GroupTitle>
      </ChatHeader>

      <MessagesContainer>
        {messages.map((message) => (
          <MessageBubble key={message.id}>
            <MessageContent>
              {message.text}
              <MessageTime>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </MessageTime>
            </MessageContent>
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <MessageInput>
        <PlusButton>+</PlusButton>
        <StyledInput 
          type="text" 
          placeholder="Type a message..." 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </MessageInput>
    </ChatContainer>
  );
};

export default GroupChatView; 