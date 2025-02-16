import React, { useState } from 'react';
import styled from 'styled-components';
import CreateGroupModal from './CreateGroupModal';

const ButtonContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
`;

const StyledButton = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(87, 227, 220), white);
  color: black;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding-bottom: 2px;
`;

interface AddGroupButtonProps {
  onConfirm: (groupName: string) => void;
}

const AddGroupButton: React.FC<AddGroupButtonProps> = ({ onConfirm }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateGroup = (groupName: string) => {
    onConfirm(groupName);
    setIsModalOpen(false);
  };

  return (
    <>
      <ButtonContainer onClick={() => setIsModalOpen(true)}>
        <StyledButton>
          +
        </StyledButton>
      </ButtonContainer>
      
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreateGroup}
      />
    </>
  );
};

export default AddGroupButton; 