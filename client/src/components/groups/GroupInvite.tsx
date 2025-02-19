import React, { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { getSocket } from '../../services/socketService';
import { useDispatch } from 'react-redux';
import { groupActions } from '../../store/slice/groupSlice';
import { useNavigate } from 'react-router-dom';

interface GroupInviteProps {
  groupId: string;
  groupName: string;
  invitedBy: string;
  messageId: string;
  onAccept: () => void;
}

const GroupInvite: React.FC<GroupInviteProps> = ({ groupId, groupName, invitedBy, messageId, onAccept }) => {
  const username = useSelector((state: RootState) => state.user.username);
  const [isAccepted, setIsAccepted] = useState(() => {
    // Check if this invite was previously accepted
    const acceptedInvites = JSON.parse(localStorage.getItem('acceptedInvites') || '[]');
    return acceptedInvites.includes(messageId);
  });
  // Check if current user is the one who sent the invite
  const isSender = username === invitedBy;
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
    'rounded-lg',
    // Typography
    'text-white text-sm font-medium',
    // Interactive
    isSender || isAccepted
      ? 'bg-gray-300 cursor-not-allowed select-none opacity-50' 
      : 'bg-[#57E3DC] hover:bg-[#4DC8C2] cursor-pointer',
    // Transitions
    'transition-colors duration-200'
  );

  const handleAcceptInvite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Early return with no action if sender tries to click
    if (isSender || isAccepted) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/groups/join`, {
        groupId,
        username: username
      });
      
      if (response.data.group) {
        getSocket().emit('group-invite-accepted', {
          groupId,
          username: username,
          group: response.data.group
        });
        
        dispatch(groupActions.addGroup(response.data.group));
        
        // Save accepted invite to localStorage using messageId instead of groupId
        const acceptedInvites = JSON.parse(localStorage.getItem('acceptedInvites') || '[]');
        acceptedInvites.push(messageId);
        localStorage.setItem('acceptedInvites', JSON.stringify(acceptedInvites));

        // Fetch initial messages for the group
        try {
          const messagesResponse = await axios.get(`${BASE_URL}/api/groups/${groupId}/messages`);
          dispatch(groupActions.setGroupMessages({
            groupId,
            messages: messagesResponse.data
          }));
        } catch (error) {
          console.error('Error fetching messages:', error);
        }

        // Navigate to the group chat
        navigate('/dashboard');
      }
      
      setIsAccepted(true);
      onAccept();
      toast.success(`Joined ${groupName}!`);
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast.error('Failed to join group');
    }
  };

  return (
    <div className={container}>
      <span className={title}>Group Invite: {groupName}</span>
      <p className={description}>
        {isSender ? 'You invited this user' : `Invited by ${invitedBy}`}
      </p>
      <button 
        className={button} 
        onClick={handleAcceptInvite}
        disabled={isSender || isAccepted}
      >
        {isSender ? 'Waiting for Response' : isAccepted ? 'Joined' : 'Join Group'}
      </button>
    </div>
  );
};

export default GroupInvite; 