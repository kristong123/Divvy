import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MessageData } from '../../types/messages';

interface GroupMember {
  username: string;
  profilePicture: string | null;
  isAdmin: boolean;
}

export interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  amount?: string;
  isGroup: true;
  users: GroupMember[];
  admin: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentEvent?: {
    id: string;
    name: string;
    date: string;
    description: string;
    expenses: Array<{
      item: string;
      amount: number;
      paidBy: string;
      splitBetween: string[];
    }>;
    updatedAt?: {
      _seconds: number;
      _nanoseconds: number;
    };
  } | null;
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
        newGroups[group.id] = {
          ...group,
          currentEvent: group.currentEvent || null
        };
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
    },
    updateGroupUsers: (state, action: PayloadAction<{
      groupId: string;
      users: Array<{
        username: string;
        profilePicture: string | null;
        isAdmin: boolean;
      }>;
    }>) => {
      const { groupId, users } = action.payload;
      if (state.groups[groupId]) {
        state.groups[groupId].users = users;
      }
    },
    setGroupEvent: (state, action: PayloadAction<{ groupId: string; event: Group['currentEvent'] }>) => {
      if (state.groups[action.payload.groupId]) {
        state.groups[action.payload.groupId].currentEvent = action.payload.event;
      }
    },
    addExpense: (state, action: PayloadAction<{ 
      groupId: string; 
      expense: {
        item: string;
        amount: number;
        paidBy: string;
        splitBetween: string[];
      }
    }>) => {
      const group = state.groups[action.payload.groupId];
      if (group?.currentEvent) {
        group.currentEvent.expenses = [...(group.currentEvent.expenses || []), action.payload.expense];
      }
    }
  }
});

export const groupActions = groupSlice.actions;
export default groupSlice.reducer; 