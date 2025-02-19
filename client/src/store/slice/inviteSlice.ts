import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
}

interface InviteState {
  groupInvites: { [username: string]: GroupInvite[] };
}

const initialState: InviteState = {
  groupInvites: {}
};

const inviteSlice = createSlice({
  name: 'invites',
  initialState,
  reducers: {
    addGroupInvite: (state, action: PayloadAction<{ username: string; invite: GroupInvite }>) => {
      const { username, invite } = action.payload;
      if (!state.groupInvites[username]) {
        state.groupInvites[username] = [];
      }
      state.groupInvites[username].push(invite);
    },
    removeGroupInvite: (state, action: PayloadAction<{ username: string; inviteId: string }>) => {
      const { username, inviteId } = action.payload;
      if (state.groupInvites[username]) {
        state.groupInvites[username] = state.groupInvites[username].filter(
          invite => invite.id !== inviteId
        );
      }
    }
  }
});

export const { addGroupInvite, removeGroupInvite } = inviteSlice.actions;
export default inviteSlice.reducer; 