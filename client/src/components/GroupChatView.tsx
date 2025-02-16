import React from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
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
`;

const MessageInput = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: white;
  gap: 12px;
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

interface GroupChatViewProps {
  group: {
    id: string;
    name: string;
    amount?: string;
  };
}

const GroupChatView: React.FC<GroupChatViewProps> = ({ group }) => {
  return (
    <ChatContainer>
      <ChatHeader>
        <GroupTitle>
          <GroupName>{group.name}</GroupName>
          {group.amount && <Amount>${group.amount}</Amount>}
        </GroupTitle>
      </ChatHeader>

      <MessagesContainer>
        {/* Messages will go here */}
      </MessagesContainer>

      <MessageInput>
        <PlusButton>+</PlusButton>
        <StyledInput type="text" placeholder="Type a message..." />
      </MessageInput>
    </ChatContainer>
  );
};

export default GroupChatView; 