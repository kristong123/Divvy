import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AddGroupButton from './AddGroupButton';
import GroupCard from './GroupCard';

interface Group {
  id: string;
  name: string;
  imageUrl?: string;
}

const Dashboard: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  const handleCreateGroup = (groupName: string) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      name: groupName,
      // You can add a default image or leave it empty
      // imageUrl: 'path/to/default/image'
    };
    setGroups([...groups, newGroup]);
  };

  const handleGroupClick = (groupId: string) => {
    console.log('Group clicked:', groupId);
  };

  return (
    <div className="row w-screen h-screen bg-white">
      <Sidebar/>
      <div className='col w-full'>
        <h1 className='ml-96 mt-6 text-5xl font-bold text-dark1'>Divvy</h1>
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
      </div>
    </div>
  );
};

export default Dashboard;