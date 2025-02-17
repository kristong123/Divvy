import React, { useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../config/api';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, groupId, groupName }) => {
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  const overlay = clsx(
    // Position
    'fixed inset-0',
    // Layout
    'flex items-center justify-center',
    // Appearance
    'bg-black bg-opacity-50',
    // Z-index
    'z-50'
  );

  const modal = clsx(
    // Layout
    'w-96',
    // Spacing
    'p-6',
    // Appearance
    'bg-white rounded-xl'
  );

  const header = clsx(
    // Layout
    'flex justify-between items-center',
    // Spacing
    'mb-4'
  );

  const title = clsx(
    // Typography
    'text-xl font-bold'
  );

  const closeButton = clsx(
    // Interactive
    'hover:bg-gray-100 rounded-full p-1',
    // Transitions
    'transition-colors duration-200'
  );

  const input = clsx(
    // Layout
    'w-full',
    // Spacing
    'px-3 py-2 mb-4',
    // Border
    'border border-gray-300 rounded-lg',
    // Focus
    'focus:outline-none focus:border-[#57E3DC]',
    // Transitions
    'transition-colors duration-200'
  );

  const submitButton = clsx(
    // Layout
    'w-full py-2',
    // Appearance
    'bg-[#57E3DC] rounded-lg',
    // Typography
    'text-white',
    // Interactive
    'hover:bg-[#4DC8C2]',
    // Transitions
    'transition-colors duration-200'
  );

  const handleInvite = async () => {
    try {
      await axios.post(`${BASE_URL}/api/groups/invite`, {
        groupId,
        username
      });
      toast.success(`Invite sent to ${username}`);
      onClose();
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to send invite');
    }
  };

  return (
    <div className={overlay}>
      <div className={modal}>
        <div className={header}>
          <h2 className={title}>Invite to {groupName}</h2>
          <button className={closeButton} onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={input}
        />
        <button className={submitButton} onClick={handleInvite}>
          Send Invite
        </button>
      </div>
    </div>
  );
};

export default InviteModal; 