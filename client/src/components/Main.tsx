import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AddGroupButton from './AddGroupButton';
import GroupCard from './GroupCard';
import GroupChatView from './GroupChatView';

interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  amount?: string;
}

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

  return (
    <div className="row w-screen h-screen bg-white">
      <Sidebar/>
      <div className='col w-full'>
        <h1 className='ml-96 mt-6 text-5xl font-bold text-dark1'>Divvy</h1>
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