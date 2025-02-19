import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MessageData } from '../../types/messages';

interface GroupMember {
  username: string;
  profilePicture: string | null;
  isAdmin: boolean;
}

interface Group {
  id: string;
  name: string;
  admin: string;
  users: GroupMember[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface GroupState {
  groups: { [key: string]: Group };
  messages: { [key: string]: MessageData[] };
  loading: boolean;
  error: string | null;
}

const initialState: GroupState = {
  groups: {},
  messages: {},
  loading: false,
  error: null
};

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups[action.payload.id] = action.payload;
    },
    setGroups: (state, action: PayloadAction<Group[]>) => {
      const newGroups: { [key: string]: Group } = {};
      action.payload.forEach(group => {
        newGroups[group.id] = group;
      });
      state.groups = newGroups;
    },
    setGroupMessages: (state, action: PayloadAction<{ groupId: string; messages: MessageData[] }>) => {
      state.messages[action.payload.groupId] = action.payload.messages;
    },
    addGroupMessage: (state, action: PayloadAction<{ groupId: string; message: MessageData }>) => {
      if (!state.messages[action.payload.groupId]) {
        state.messages[action.payload.groupId] = [];
      }
      state.messages[action.payload.groupId].push(action.payload.message);
    },
    updateGroup: (state, action: PayloadAction<Partial<Group> & { id: string }>) => {
      if (state.groups[action.payload.id]) {
        state.groups[action.payload.id] = {
          ...state.groups[action.payload.id],
          ...action.payload
        };
      }
    },
    addGroupMember: (state, action: PayloadAction<{
      groupId: string;
      member: {
        username: string;
        profilePicture: string | null;
        isAdmin: boolean;
      };
    }>) => {
      const { groupId, member } = action.payload;
      const group = state.groups[groupId];
      if (group) {
        if (!group.users.some(user => user.username === member.username)) {
          group.users.push(member);
        }
      }
    }
  }
});

export const groupActions = groupSlice.actions;
export default groupSlice.reducer; 