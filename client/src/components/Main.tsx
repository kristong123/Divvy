import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AddGroupButton from './AddGroupButton';
import GroupCard from './GroupCard';
import GroupChatView from './GroupChatView';
import styled from 'styled-components';

interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  amount?: string;
}

const TitleLink = styled.h1`
  margin-left: 24rem;
  margin-top: 1.5rem;
  font-size: 3rem;
  font-weight: bold;
  color: rgb(87, 227, 220);
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

const Dashboard: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const handleCreateGroup = (groupName: string) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      name: groupName,
    };
    setGroups([...groups, newGroup]);
  };

  const handleGroupClick = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
    }
  };

  const handleTitleClick = () => {
    setSelectedGroup(null); // Reset selected group to return to dashboard
  };

  return (
    <div className="row w-screen h-screen bg-white">
      <Sidebar/>
      <div className='col w-full'>
        <TitleLink onClick={handleTitleClick}>Divvy</TitleLink>
        {!selectedGroup ? (
          <div className='row flex-wrap gap-4 p-4'>
            {groups.map(group => (
              <GroupCard
                key={group.id}
                name={group.name}
                imageUrl={group.imageUrl}
                onClick={() => handleGroupClick(group.id)}
              />
            ))}
            <AddGroupButton onConfirm={handleCreateGroup} />
          </div>
        ) : (
          <GroupChatView group={selectedGroup} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;