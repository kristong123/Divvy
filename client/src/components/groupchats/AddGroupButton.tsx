import React, { useState } from 'react';
import CreateGroupWindow from '../modals/CreateGroupModal';
import clsx from 'clsx';

interface AddGroupButtonProps {
  onConfirm: (groupName: string) => void;
}

const AddGroupButton: React.FC<AddGroupButtonProps> = ({ onConfirm }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateGroup = (groupName: string) => {
    onConfirm(groupName);
    setIsModalOpen(false);
  };

  const buttonContainer = clsx(
    // Layout
    'w-48 h-48',
    'flex items-center justify-center',
    // Appearance
    'bg-white rounded-2xl shadow-md',
    // Interactive
    'cursor-pointer'
  );

  const plusButton = clsx(
    // Layout
    'w-10 h-10',
    'flex items-center justify-center',
    // Appearance
    'rounded-full',
    'bg-gradient-to-tr from-[#57E3DC] to-white',
    // Typography
    'text-black text-2xl',
    // Spacing
    'pb-0.5'
  );

  return (
    <>
      <div className={buttonContainer} onClick={() => setIsModalOpen(true)}>
        <div className={plusButton}>+</div>
      </div>
      
      <CreateGroupWindow
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreateGroup}
      />
    </>
  );
};

export default AddGroupButton; 