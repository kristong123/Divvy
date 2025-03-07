import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Message } from "../../types/messageTypes";
import { Group, Event } from "../../types/groupTypes";

interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
}

export type InviteStatus =
  | "valid"
  | "invalid"
  | "already_member"
  | "accepted"
  | "declined"
  | "loading"
  | "sent";

interface LocalGroupState {
  groups: { [key: string]: Group };
  messages: { [key: string]: Message[] };
  loading: boolean;
  error: string | null;
  groupInvites: { [username: string]: GroupInvite[] };
  inviteStatus: { [inviteId: string]: InviteStatus };
}

const initialState: LocalGroupState = {
  groups: {},
  messages: {},
  loading: false,
  error: null,
  groupInvites: {},
  inviteStatus: {},
};

export const groupSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    addGroup: (state, action: PayloadAction<Group>) => {
      // If the group already exists, we need to merge the users carefully to avoid duplicates
      const existingGroup = state.groups[action.payload.id];

      // Deduplicate users if provided
      let mergedUsers = action.payload.users;

      if (existingGroup && Array.isArray(mergedUsers)) {
        // Create a map of usernames to avoid duplicates
        const uniqueUsers = new Map();

        // First add existing users to the map
        if (existingGroup.users) {
          existingGroup.users.forEach((user) => {
            uniqueUsers.set(user.username, user);
          });
        }

        // Then add new users, overwriting existing ones if they have the same username
        mergedUsers.forEach((user) => {
          uniqueUsers.set(user.username, user);
        });

        // Convert map values back to array
        mergedUsers = Array.from(uniqueUsers.values());
      }

      const newGroup = {
        ...action.payload,
        messages: state.groups[action.payload.id]?.messages || [],
        currentEvent:
          action.payload.currentEvent ||
          state.groups[action.payload.id]?.currentEvent ||
          null,
        // Use deduplicated users
        users: mergedUsers,
      };

      state.groups[action.payload.id] = newGroup;
    },
    setGroups: (state, action: PayloadAction<Group[]>) => {
      const newGroups: { [key: string]: Group } = {};
      action.payload.forEach((group) => {
        newGroups[group.id] = {
          ...group,
          currentEvent: group.currentEvent || null,
        };
      });
      state.groups = newGroups;
    },
    setGroupMessages: (
      state,
      action: PayloadAction<{ groupId: string; messages: Message[] }>
    ) => {
      state.messages[action.payload.groupId] = action.payload.messages;
    },
    addGroupMessage: (
      state,
      action: PayloadAction<{ groupId: string; message: Message }>
    ) => {
      if (!state.messages[action.payload.groupId]) {
        state.messages[action.payload.groupId] = [];
      }
      state.messages[action.payload.groupId].push(action.payload.message);
    },
    updateGroup: (
      state,
      action: PayloadAction<Partial<Group> & { id: string }>
    ) => {
      if (state.groups[action.payload.id]) {
        // If users array is provided, deduplicate it based on username
        let updatedUsers = action.payload.users;
        if (updatedUsers) {
          // Create a map of usernames to avoid duplicates
          const uniqueUsers = new Map();
          updatedUsers.forEach((user) => {
            // Only add if not already in the map
            if (!uniqueUsers.has(user.username)) {
              uniqueUsers.set(user.username, user);
            }
          });
          // Convert map values back to array
          updatedUsers = Array.from(uniqueUsers.values());
        }

        state.groups[action.payload.id] = {
          ...state.groups[action.payload.id],
          ...action.payload,
          // Use deduplicated users if available
          users: updatedUsers || state.groups[action.payload.id].users,
        };
      }
    },
    addGroupMember: (
      state,
      action: PayloadAction<{
        groupId: string;
        member: {
          username: string;
          profilePicture: string | null;
          isAdmin: boolean;
        };
      }>
    ) => {
      const { groupId, member } = action.payload;
      const group = state.groups[groupId];
      if (group) {
        if (!group.users.some((user) => user.username === member.username)) {
          group.users.push(member);
        }
      }
    },
    updateGroupUsers: (
      state,
      action: PayloadAction<{
        groupId: string;
        users: Array<{
          username: string;
          profilePicture: string | null;
          isAdmin: boolean;
        }>;
      }>
    ) => {
      const { groupId, users } = action.payload;
      if (state.groups[groupId]) {
        state.groups[groupId].users = users;
      }
    },
    setGroupEvent: (
      state,
      action: PayloadAction<{
        groupId: string;
        event: Event | null | undefined;
        keepEventOpen?: boolean;
      }>
    ) => {
      if (state.groups[action.payload.groupId]) {
        state.groups[action.payload.groupId].currentEvent =
          action.payload.event;
      }
    },
    addExpense: (
      state,
      action: PayloadAction<{
        groupId: string;
        expense: any; // Use any for the input to handle legacy code
        keepEventOpen?: boolean;
      }>
    ) => {
      const { groupId, expense, keepEventOpen } = action.payload;

      // Log expense addition with emoji
      console.log(
        `💰 Adding expense: ${expense.itemName || expense.item} ($${
          expense.amount
        }) to group: ${groupId}`
      );

      if (state.groups[groupId] && state.groups[groupId].currentEvent) {
        // Create a new expense object that conforms to the Expense interface
        const newExpense = {
          id: expense.id || `temp-${Date.now()}`,
          itemName: expense.itemName || expense.item || "Expense",
          amount: expense.amount,
          addedBy: expense.addedBy || expense.paidBy || "Unknown",
          date: expense.date || new Date().toISOString(),
        };

        state.groups[groupId].currentEvent!.expenses = [
          ...state.groups[groupId].currentEvent!.expenses,
          newExpense,
        ];

        if (keepEventOpen) {
          state.groups[groupId].keepEventOpen = true;
        }
      }
    },
    updateGroupUser: (
      state,
      action: PayloadAction<{
        groupId: string;
        user: {
          username: string;
          profilePicture: string | null;
          isAdmin: boolean;
          venmoUsername?: string;
        };
      }>
    ) => {
      const { groupId, user } = action.payload;
      if (state.groups[groupId]) {
        state.groups[groupId].users = state.groups[groupId].users.map((u) =>
          u.username === user.username ? { ...u, ...user } : u
        );
      }
    },
    addGroupInvite: (
      state,
      action: PayloadAction<{ username: string; invite: GroupInvite }>
    ) => {
      const { username, invite } = action.payload;
      if (!state.groupInvites[username]) {
        state.groupInvites[username] = [];
      }
      state.groupInvites[username].push(invite);
    },
    removeGroupInvite: (
      state,
      action: PayloadAction<{ username: string; inviteId: string }>
    ) => {
      const { username, inviteId } = action.payload;
      if (state.groupInvites[username]) {
        state.groupInvites[username] = state.groupInvites[username].filter(
          (invite) => invite.id !== inviteId
        );
      }
    },
    setInviteStatus: (
      state,
      action: PayloadAction<{ inviteId: string; status: InviteStatus }>
    ) => {
      const { inviteId, status } = action.payload;
      state.inviteStatus[inviteId] = status;
    },
    removeInviteStatus: (state, action: PayloadAction<string>) => {
      const inviteId = action.payload;
      delete state.inviteStatus[inviteId];
    },
    markGroupInvitesInvalid: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      Object.keys(state.inviteStatus).forEach((inviteId) => {
        if (inviteId.startsWith(groupId)) {
          state.inviteStatus[inviteId] = "invalid";
        }
      });
    },
    markUserInvitesAsMember: (
      state,
      action: PayloadAction<{ groupId: string; username: string }>
    ) => {
      const { groupId } = action.payload;
      Object.keys(state.inviteStatus).forEach((inviteId) => {
        if (inviteId.startsWith(groupId)) {
          state.inviteStatus[inviteId] = "already_member";
        }
      });
    },
  },
});

export const {
  addGroup,
  setGroups,
  setGroupMessages,
  addGroupMessage,
  updateGroup,
  addGroupMember,
  updateGroupUsers,
  setGroupEvent,
  addExpense,
  updateGroupUser,
  addGroupInvite,
  removeGroupInvite,
  setInviteStatus,
  removeInviteStatus,
  markGroupInvitesInvalid,
  markUserInvitesAsMember,
} = groupSlice.actions;
export const groupActions = groupSlice.actions;
export default groupSlice.reducer;
