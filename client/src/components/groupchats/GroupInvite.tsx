import React, { useEffect } from 'react';
import clsx from 'clsx';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import { toast } from 'react-hot-toast';
import { removeGroupInvite } from '../../store/slice/inviteSlice';
import { RootState } from '../../store/store';
import { getSocket } from '../../services/socketService';
import { 
  setInviteStatus, 
  InviteStatus 
} from '../../store/slice/inviteStatusSlice';

interface GroupInviteProps {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  messageId?: string;
  onAccept: (inviteId: string) => void;
}

const GroupInvite: React.FC<GroupInviteProps> = ({ 
  id, 
  groupId, 
  groupName, 
  invitedBy,
  onAccept 
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.username);
  
  // Get status from Redux instead of local state
  const inviteStatus = useSelector((state: RootState) => 
    state.inviteStatus[id] || 'loading'
  ) as InviteStatus;

  // Check group status initially and store in Redux
  useEffect(() => {
    const checkGroupStatus = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/groups/${groupId}/status?username=${currentUser}`);
        
        let status: InviteStatus = 'valid';
        if (!response.data.exists) {
          status = 'invalid';
        } else if (response.data.isMember) {
          status = 'already_member';
        }
        
        dispatch(setInviteStatus({ inviteId: id, status }));
      } catch (error) {
        console.error('Error checking group status:', error);
        dispatch(setInviteStatus({ inviteId: id, status: 'invalid' }));
      }
    };

    if (inviteStatus === 'loading') {
      checkGroupStatus();
    }
  }, [groupId, currentUser, dispatch, id, inviteStatus]);

  // Listen for socket events that might affect the invite status
  useEffect(() => {
    const socket = getSocket();

    // Group was deleted
    const handleGroupDeleted = (data: { groupId: string }) => {
      if (data.groupId === groupId) {
        dispatch(setInviteStatus({ inviteId: id, status: 'invalid' }));
      }
    };

    // User was added to the group
    const handleUserAddedToGroup = (data: { groupId: string }) => {
      if (data.groupId === groupId) {
        dispatch(setInviteStatus({ inviteId: id, status: 'already_member' }));
      }
    };

    // User was removed from the group
    const handleUserRemovedFromGroup = (data: { groupId: string }) => {
      if (data.groupId === groupId && 
          inviteStatus !== 'declined' && 
          inviteStatus !== 'accepted') {
        dispatch(setInviteStatus({ inviteId: id, status: 'valid' }));
      }
    };

    socket.on('group-deleted', handleGroupDeleted);
    socket.on('user-added-to-group', handleUserAddedToGroup);
    socket.on('user-removed-from-group', handleUserRemovedFromGroup);

    return () => {
      socket.off('group-deleted', handleGroupDeleted);
      socket.off('user-added-to-group', handleUserAddedToGroup);
      socket.off('user-removed-from-group', handleUserRemovedFromGroup);
    };
  }, [groupId, inviteStatus, dispatch, id]);

  const container = clsx(
    // Layout
    'flex flex-col',
    // Spacing
    'p-3',
    // Appearance
    'bg-gray-100 rounded-xl',
    // Width
    'w-fit'
  );

  const title = clsx(
    // Typography
    'text-sm font-semibold text-black'
  );

  const description = clsx(
    // Typography
    'text-sm text-gray-600'
  );

  const buttonContainer = clsx(
    // Layout
    'flex gap-2 mt-2'
  );

  const acceptButton = clsx(
    // Layout
    'px-3 py-1',
    // Appearance
    inviteStatus === 'valid' 
      ? 'bg-[#57E3DC] cursor-pointer'
      : 'bg-gray-300 cursor-not-allowed',
    // Typography
    'text-sm text-white font-medium',
    // Border
    'rounded-md'
  );

  const declineButton = clsx(
    // Layout
    'px-3 py-1',
    // Appearance
    inviteStatus === 'valid'
      ? 'bg-gray-300 cursor-pointer'
      : 'bg-gray-200 cursor-not-allowed',
    // Typography
    'text-sm text-gray-700 font-medium',
    // Border
    'rounded-md'
  );

  const handleAccept = async () => {
    if (inviteStatus !== 'valid') return;
    
    try {
      dispatch(setInviteStatus({ inviteId: id, status: 'accepted' }));
      await axios.post(`${BASE_URL}/api/groups/join`, {
        groupId,
        username: currentUser
      });
      
      onAccept(id);
      toast.success(`You joined ${groupName}`);
    } catch (error) {
      dispatch(setInviteStatus({ inviteId: id, status: 'valid' }));
      toast.error('Failed to join group');
    }
  };

  const handleDecline = () => {
    if (inviteStatus !== 'valid') return;
    
    dispatch(setInviteStatus({ inviteId: id, status: 'declined' }));
    dispatch(removeGroupInvite({ 
      username: invitedBy,
      inviteId: id 
    }));
    
    toast.success(`Declined invitation to ${groupName}`);
  };

  // Get status message based on invite status
  const getStatusMessage = () => {
    switch (inviteStatus) {
      case 'loading':
        return 'Checking invite status...';
      case 'invalid':
        return 'This group no longer exists';
      case 'already_member':
        return 'You are already a member of this group';
      case 'accepted':
        return `You accepted the invitation to ${groupName}`;
      case 'declined':
        return `You declined the invitation to ${groupName}`;
      case 'valid':
        return `You've been invited to join ${groupName}`;
    }
  };

  // Get button text based on status
  const getAcceptButtonText = () => {
    switch (inviteStatus) {
      case 'accepted':
        return 'Accepted';
      case 'already_member':
        return 'Already Joined';
      default:
        return 'Accept';
    }
  };

  const getDeclineButtonText = () => {
    return inviteStatus === 'declined' ? 'Declined' : 'Decline';
  };

  return (
    <div className={container}>
      <span className={title}>Group Invite</span>
      <p className={description}>
        {getStatusMessage()}
      </p>
      <div className={buttonContainer}>
        <button 
          className={acceptButton}
          onClick={handleAccept}
          disabled={inviteStatus !== 'valid'}
        >
          {getAcceptButtonText()}
        </button>
        <button 
          className={declineButton}
          onClick={handleDecline}
          disabled={inviteStatus !== 'valid'}
        >
          {getDeclineButtonText()}
        </button>
      </div>
    </div>
  );
};

export default GroupInvite; 