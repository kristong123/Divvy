import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type InviteStatus = 'valid' | 'invalid' | 'already_member' | 'accepted' | 'declined' | 'loading';

interface InviteStatusState {
  [inviteId: string]: InviteStatus;
}

const initialState: InviteStatusState = {};

const inviteStatusSlice = createSlice({
  name: 'inviteStatus',
  initialState,
  reducers: {
    setInviteStatus: (state, action: PayloadAction<{ inviteId: string; status: InviteStatus }>) => {
      const { inviteId, status } = action.payload;
      state[inviteId] = status;
    },
    batchSetInviteStatuses: (state, action: PayloadAction<{ [inviteId: string]: InviteStatus }>) => {
      return { ...state, ...action.payload };
    },
    removeInviteStatus: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
    // Handle group deletion - mark all invites for this group as invalid
    markGroupInvitesInvalid: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      Object.keys(state).forEach(inviteId => {
        if (inviteId.startsWith(groupId)) {
          state[inviteId] = 'invalid';
        }
      });
    },
    // Handle user added to group - mark all invites for this user/group as already_member
    markUserInvitesAsMember: (state, action: PayloadAction<{ groupId: string; username: string }>) => {
      const { groupId } = action.payload;
      Object.keys(state).forEach(inviteId => {
        if (inviteId.startsWith(groupId)) {
          state[inviteId] = 'already_member';
        }
      });
    }
  }
});

export const { 
  setInviteStatus, 
  batchSetInviteStatuses,
  removeInviteStatus, 
  markGroupInvitesInvalid, 
  markUserInvitesAsMember 
} = inviteStatusSlice.actions;

export default inviteStatusSlice.reducer; 