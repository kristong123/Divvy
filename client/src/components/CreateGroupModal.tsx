import React, { useState } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 24px;
  border-radius: 16px;
  width: 400px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 16px 0;
  font-size: 16px;
  color: black;
  
  &:focus {
    outline: none;
    border-color: rgb(87, 227, 220);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  
  ${props => props.primary ? `
    background-color: rgb(87, 227, 220);
    color: white;
    
    &:hover {
      background-color: rgb(77, 200, 194);
    }
  ` : `
    background-color: #f0f0f0;
    color: #333;
    
    &:hover {
      background-color: #e0e0e0;
    }
  `}
`;

const Title = styled.h2`
  color: black;
  margin: 0;
  font-size: 20px;
`;

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupName: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [groupName, setGroupName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (groupName.trim()) {
      onConfirm(groupName.trim());
      setGroupName('');
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <Title>Create New Group</Title>
        <Input
          type="text"
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          autoFocus
        />
        <ButtonContainer>
          <Button onClick={onClose}>Cancel</Button>
          <Button primary onClick={handleSubmit}>Create Group</Button>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateGroupModal; 