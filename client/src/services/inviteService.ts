import axios from 'axios';
import { BASE_URL } from '../config/api';
import { store } from '../store/store';
import { batchSetInviteStatuses, InviteStatus } from '../store/slice/inviteStatusSlice';

export const checkAllGroupInvites = async (username: string) => {
  try {
    console.log('Checking all group invites for:', username);
    // Get all group invites from the Redux store
    const state = store.getState();
    const groupInvites = state.invites.groupInvites[username] || [];
    
    if (groupInvites.length === 0) return;
    
    // Create a batch request to check all group statuses
    const groupIds = [...new Set(groupInvites.map(invite => invite.groupId))];
    
    // Fetch status for all groups in parallel
    const statusPromises = groupIds.map(groupId => 
      axios.get(`${BASE_URL}/api/groups/${groupId}/status?username=${username}`)
    );
    
    const responses = await Promise.all(statusPromises);
    
    // Create a map of group statuses
    const groupStatuses: Record<string, InviteStatus> = {};
    responses.forEach((response, index) => {
      const groupId = groupIds[index];
      if (!response.data.exists) {
        groupStatuses[groupId] = 'invalid';
      } else if (response.data.isMember) {
        groupStatuses[groupId] = 'already_member';
      } else {
        groupStatuses[groupId] = 'valid';
      }
    });
    
    // Create a batch update for all invites
    const inviteStatuses: Record<string, InviteStatus> = {};
    groupInvites.forEach(invite => {
      inviteStatuses[invite.id] = groupStatuses[invite.groupId] as InviteStatus;
    });
    
    // Dispatch the batch update
    store.dispatch(batchSetInviteStatuses(inviteStatuses));
    
    console.log('Batch updated invite statuses:', inviteStatuses);
  } catch (error) {
    console.error('Error checking group invites:', error);
  }
}; 