import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MessageData } from '../../types/messageTypes';
import { Group, GroupState, Event, Expense } from '../../types/groupTypes';

const initialState: GroupState = {
  groups: {},
  messages: {},
  loading: false,
  error: null
};

export const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    addGroup: (state, action: PayloadAction<Group>) => {
      const newGroup = {
        ...action.payload,
        messages: state.groups[action.payload.id]?.messages || [],
        currentEvent: action.payload.currentEvent || state.groups[action.payload.id]?.currentEvent || null
      };
      
      state.groups[action.payload.id] = newGroup;
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
    setGroupEvent: (state, action: PayloadAction<{
      groupId: string;
      event: Event | null | undefined;
      keepEventOpen?: boolean;
    }>) => {
      if (state.groups[action.payload.groupId]) {
        state.groups[action.payload.groupId].currentEvent = action.payload.event;
      }
    },
    addExpense: (state, action: PayloadAction<{groupId: string, expense: Expense, keepEventOpen?: boolean}>) => {
      const { groupId, expense, keepEventOpen } = action.payload;
      
      console.log("Adding expense to Redux store:", expense);
      
      if (state.groups[groupId] && state.groups[groupId].currentEvent) {
        state.groups[groupId].currentEvent!.expenses = [
          ...state.groups[groupId].currentEvent!.expenses,
          {
            ...expense,
            id: expense.id || `temp-${Date.now()}`,
            splitBetween: expense.splitBetween || [],
          }
        ];
        
        if (keepEventOpen) {
          state.groups[groupId].keepEventOpen = true;
        }
        
        console.log("Updated expenses:", state.groups[groupId].currentEvent!.expenses);
      }
    },
    updateGroupUser: (state, action: PayloadAction<{
      groupId: string;
      user: {
        username: string;
        profilePicture: string | null;
        isAdmin: boolean;
        venmoUsername?: string;
      };
    }>) => {
      const { groupId, user } = action.payload;
      if (state.groups[groupId]) {
        state.groups[groupId].users = state.groups[groupId].users.map(u => 
          u.username === user.username ? { ...u, ...user } : u
        );
      }
    }
  }
});

export const groupActions = groupSlice.actions;
export default groupSlice.reducer; 