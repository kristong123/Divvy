import React, { useState } from 'react';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import AddGroupButton from './AddGroupButton';
import GroupCard from './GroupCard';
import GroupChatView from './ChatView';

interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  amount?: string;
}

const Main: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const titleLink = clsx(
    // Layout
    'ml-96 mt-6',
    // Typography
    'text-5xl font-bold',
    'text-[#57E3DC]',
    // Interactive
    'cursor-pointer hover:opacity-80',
    // Transitions
    'transition-opacity duration-300'
  );

  const groupsContainer = clsx(
    // Layout
    'flex flex-wrap',
    // Spacing
    'gap-4 p-4'
  );

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

  return (
    <div className="flex w-screen h-screen bg-white">
      <Sidebar/>
      <div className='flex flex-col w-full'>
        <h1 className={titleLink} onClick={() => setSelectedGroup(null)}>
          Divvy
        </h1>
        {!selectedGroup ? (
          <div className={groupsContainer}>
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

export default Main;