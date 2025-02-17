import React from 'react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../config/api';

interface GroupInviteProps {
  groupId: string;
  groupName: string;
  invitedBy: string;
}

const GroupInvite: React.FC<GroupInviteProps> = ({ groupId, groupName, invitedBy }) => {
  const container = clsx(
    // Layout
    'flex flex-col',
    // Spacing
    'p-4',
    // Appearance
    'bg-gray-100 rounded-xl',
    // Width
    'max-w-[70%]'
  );

  const title = clsx(
    // Typography
    'text-sm font-bold text-black'
  );

  const description = clsx(
    // Typography
    'text-sm text-gray-600'
  );

  const button = clsx(
    // Layout
    'mt-3 px-4 py-2',
    // Appearance
    'bg-[#57E3DC] rounded-lg',
    // Typography
    'text-white text-sm font-medium',
    // Interactive
    'hover:bg-[#4DC8C2] cursor-pointer',
    // Transitions
    'transition-colors duration-200'
  );

  const handleAcceptInvite = async () => {
    try {
      await axios.post(`${BASE_URL}/api/groups/join`, {
        groupId,
        userId: invitedBy
      });
      toast.success(`Joined ${groupName}!`);
    } catch (error) {
      console.error('Join group error:', error);
      toast.error('Failed to join group');
    }
  };

  return (
    <div className={container}>
      <span className={title}>Group Invite: {groupName}</span>
      <p className={description}>Invited by {invitedBy}</p>
      <button className={button} onClick={handleAcceptInvite}>
        Join Group
      </button>
    </div>
  );
};

export default GroupInvite; 