import React from 'react';
import styled from 'styled-components';

const Card = styled.div`
  background: white;
  border-radius: 16px;
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  padding: 8px;
`;

const PhotoContainer = styled.div`
  flex: 1;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background-color: #f0f0f0; // placeholder background
  margin-bottom: 24px; // space for the name
`;

const GroupImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const GroupName = styled.div`
  color: black;
  font-size: 14px;
  font-weight: 700;
  position: absolute;
  bottom: 8px;
  left: 8px;
`;

interface GroupCardProps {
  name: string;
  imageUrl?: string;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ name, imageUrl, onClick }) => {
  return (
    <Card onClick={onClick}>
      <PhotoContainer>
        {imageUrl && <GroupImage src={imageUrl} alt={name} />}
      </PhotoContainer>
      <GroupName>{name}</GroupName>
    </Card>
  );
};

export default GroupCard; 