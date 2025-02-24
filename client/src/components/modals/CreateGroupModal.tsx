import React, { useState } from 'react';
import Modal from '../shared/Modal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupName: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [groupName, setGroupName] = useState('');

  const handleSubmit = () => {
    if (groupName.trim()) {
      onConfirm(groupName.trim());
      setGroupName('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      actionButton={{
        text: "Create Group",
        onClick: handleSubmit,
        disabled: !groupName.trim(),
        color: "primary"
      }}
    >
      <div className="mt-4">
        <input
          type="text"
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full px-3 py-3 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
    </Modal>
  );
};

export default CreateGroupModal; 