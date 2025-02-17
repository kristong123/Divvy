import React, { useState } from 'react';
import clsx from 'clsx';

interface CreateGroupWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupName: string) => void;
}

const CreateGroupWindow: React.FC<CreateGroupWindowProps> = ({ isOpen, onClose, onConfirm }) => {
  const [groupName, setGroupName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (groupName.trim()) {
      onConfirm(groupName.trim());
      setGroupName('');
    }
  };

  const modalOverlay = clsx(
    // Position
    'fixed inset-0',
    // Layout
    'flex items-center justify-center',
    // Appearance
    'bg-black/50',
    // Z-index
    'z-[1000]'
  );

  const modalContent = clsx(
    // Layout
    'w-[400px]',
    // Spacing
    'p-6',
    // Appearance
    'bg-white rounded-2xl',
    'shadow-lg'
  );

  const input = clsx(
    // Layout
    'w-full',
    // Spacing
    'px-3 py-3',
    'my-4',
    // Typography
    'text-base text-black',
    // Border
    'border border-gray-200 rounded-lg',
    // Focus
    'focus:outline-none focus:border-[#57E3DC]',
  );

  const buttonContainer = clsx(
    // Layout
    'flex justify-end gap-3',
    // Spacing
    'mt-6'
  );

  const baseButton = clsx(
    // Layout
    'px-4 py-2',
    // Typography
    'text-sm',
    // Appearance
    'rounded-lg',
    'border-none',
    'cursor-pointer'
  );

  const secondaryButton = clsx(
    baseButton,
    // Colors
    'bg-gray-100 text-gray-700',
    // Hover
    'hover:bg-gray-200'
  );

  const primaryButton = clsx(
    baseButton,
    // Colors
    'bg-[#57E3DC] text-white',
    // Hover
    'hover:bg-[#4DC8C2]'
  );

  const title = clsx(
    // Typography
    'text-xl font-medium text-black',
    // Spacing
    'm-0'
  );

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={modalContent} onClick={e => e.stopPropagation()}>
        <h2 className={title}>Create New Group</h2>
        <input
          type="text"
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={input}
          autoFocus
        />
        <div className={buttonContainer}>
          <button className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryButton} onClick={handleSubmit}>
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupWindow; 