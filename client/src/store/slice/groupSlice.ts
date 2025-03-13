import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Message } from "../../types/messageTypes";
import { Group, Event } from "../../types/groupTypes";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { toast } from "react-hot-toast";

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

// Interface for cached group images
interface CachedGroupImage {
  groupId: string;
  imageSource: string; // The original path or URL
  downloadUrl: string; // The actual download URL
  isValid: boolean;
  lastUpdated: number; // Timestamp for cache invalidation
  useProxy?: boolean; // Whether to use a proxy for this image
}

interface LocalGroupState {
  groups: { [key: string]: Group };
  messages: { [key: string]: Message[] };
  loading: boolean;
  error: string | null;
  groupInvites: { [username: string]: GroupInvite[] };
  inviteStatus: { [inviteId: string]: InviteStatus };
  // Add group image cache
  groupImageCache: { [groupId: string]: CachedGroupImage };
}

const initialState: LocalGroupState = {
  groups: {},
  messages: {},
  loading: false,
  error: null,
  groupInvites: {},
  inviteStatus: {},
  groupImageCache: {},
};

// AsyncThunk for fetching user groups
export const fetchUserGroups = createAsyncThunk(
  "groups/fetchUserGroups",
  async (username: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/groups/user/${username}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      throw error;
    }
  }
);

// AsyncThunk for creating a new group
export const createGroup = createAsyncThunk(
  "groups/createGroup",
  async ({ groupName, username }: { groupName: string; username: string }) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/groups/create`, {
        name: groupName,
        createdBy: username,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create group:", error);
      throw error;
    }
  }
);

// AsyncThunk for fetching group messages
export const fetchGroupMessages = createAsyncThunk(
  "groups/fetchMessages",
  async (groupId: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/groups/${groupId}/messages`);
      return { groupId, messages: response.data };
    } catch (error) {
      console.error(`Failed to load messages for group ${groupId}:`, error);
      throw error;
    }
  }
);

// AsyncThunk for fetching group invites
export const fetchGroupInvites = createAsyncThunk(
  "groups/fetchInvites",
  async (username: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/groups/invites/${username}`);
      return { username, invites: response.data };
    } catch (error) {
      console.error("Failed to fetch group invites:", error);
      throw error;
    }
  }
);

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
    removeGroup: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      delete state.groups[groupId];
      delete state.messages[groupId];
      // Also clear the image cache for this group
      delete state.groupImageCache[groupId];
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
    setGroupMessages: (state, action: PayloadAction<{ groupId: string; messages: Message[] }>) => {
      const { groupId, messages } = action.payload;
      
      // Create a map of existing messages by ID
      const existingMessages = new Map(
        (state.messages[groupId] || []).map(msg => [msg.id, msg])
      );
      
      // Add new messages, overwriting existing ones with updated data
      messages.forEach(msg => {
        if (msg.id) {
          existingMessages.set(msg.id, {
            ...existingMessages.get(msg.id),
            ...msg
          });
        }
      });
      
      // Convert back to array and sort by timestamp
      state.messages[groupId] = Array.from(existingMessages.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },
    addGroupMessage: (state, action: PayloadAction<{ groupId: string; message: Message }>) => {
      const { groupId, message } = action.payload;
      
      if (!state.messages[groupId]) {
        state.messages[groupId] = [];
      }
      
      // Check if message already exists
      const existingIndex = state.messages[groupId]
        .findIndex(msg => msg.id === message.id);
        
      if (existingIndex === -1) {
        // Add new message
        state.messages[groupId].push(message);
      } else {
        // Update existing message
        state.messages[groupId][existingIndex] = {
          ...state.messages[groupId][existingIndex],
          ...message
        };
      }
      
      // Sort messages by timestamp
      state.messages[groupId].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
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
        
        // If imageUrl is updated, clear the image cache for this group
        if (action.payload.imageUrl) {
          delete state.groupImageCache[action.payload.id];
        }
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
        expense: any;
        keepEventOpen?: boolean;
      }>
    ) => {
      const { groupId, expense, keepEventOpen } = action.payload;

      console.log(
        `💰 Adding expense: ${expense.itemName} ($${
          expense.amount
        }) to group: ${groupId}`
      );

      if (state.groups[groupId] && state.groups[groupId].currentEvent) {
        // Create a new expense object that matches the Expense interface
        const newExpense = {
          id: expense.id || `temp-${Date.now()}`,
          itemName: expense.itemName || "Expense",
          amount: expense.amount,
          addedBy: expense.addedBy || expense.paidBy || "Unknown",
          paidBy: expense.paidBy || expense.addedBy || "Unknown",
          debtor: expense._debtor || expense.debtor || "",
          splitBetween: expense.splitBetween || [],
          date: expense.date || new Date().toISOString(),
          _debtor: expense._debtor,
          _splitBetween: expense._splitBetween
        };

        // Update the expenses array with type safety
        const currentExpenses = state.groups[groupId].currentEvent!.expenses || [];
        state.groups[groupId].currentEvent!.expenses = [...currentExpenses, newExpense];

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
    // Group image caching actions
    cacheGroupImage: (
      state,
      action: PayloadAction<{
        groupId: string;
        imageSource: string;
        downloadUrl: string;
        isValid: boolean;
        useProxy?: boolean;
      }>
    ) => {
      const { groupId, imageSource, downloadUrl, isValid, useProxy } = action.payload;
      state.groupImageCache[groupId] = {
        groupId,
        imageSource,
        downloadUrl,
        isValid,
        useProxy,
        lastUpdated: Date.now(),
      };
    },
    clearGroupImageCache: (
      state,
      action: PayloadAction<string> // groupId
    ) => {
      delete state.groupImageCache[action.payload];
    },
    clearAllGroupImageCache: (state) => {
      state.groupImageCache = {};
    },
    forceGroupImageRefresh: (
      state,
      action: PayloadAction<string> // groupId
    ) => {
      const groupId = action.payload;
      if (state.groupImageCache[groupId]) {
        // Add a timestamp to the URL to force a refresh
        const url = state.groupImageCache[groupId].downloadUrl;
        state.groupImageCache[groupId].downloadUrl = url.includes("?")
          ? url.split("?")[0] + "?t=" + Date.now()
          : url + "?t=" + Date.now();
        state.groupImageCache[groupId].lastUpdated = Date.now();
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
    updateMessageReadStatus: (state, action: PayloadAction<{
      groupId: string;
      messageId: string;
      readBy: string[];
      isLatest: boolean;
    }>) => {
      const { groupId, messageId, readBy, isLatest } = action.payload;
      const messages = state.messages[groupId];
      
      if (messages) {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          // For the latest read message, we want to ensure we have all readers
          if (isLatest) {
            messages[messageIndex].readBy = Array.from(new Set(readBy));
          } else {
            // For previous messages, merge with existing readers
            const existingReadBy = messages[messageIndex].readBy || [];
            messages[messageIndex].readBy = Array.from(new Set([...existingReadBy, ...readBy]));
          }
          
          // Update all previous messages to include these readers
          for (let i = 0; i < messageIndex; i++) {
            const currentReadBy = messages[i].readBy || [];
            messages[i].readBy = Array.from(new Set([...currentReadBy, ...readBy]));
          }
        }
      }
    },
    updateAllUserProfilePictures: (
      state,
      action: PayloadAction<{
        username: string;
        profilePicture: string;
      }>
    ) => {
      const { username, profilePicture } = action.payload;
      
      // Update the profile picture for this user in all groups
      Object.keys(state.groups).forEach(groupId => {
        const group = state.groups[groupId];
        if (group && Array.isArray(group.users)) {
          const userIndex = group.users.findIndex(u => u && u.username === username);
          if (userIndex !== -1) {
            // Update the profile picture for this user in this group
            group.users[userIndex].profilePicture = profilePicture;
          }
        }
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch user groups
      .addCase(fetchUserGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.loading = false;
        // Convert array to object with groupId as key
        const groupsObject: { [key: string]: Group } = {};
        action.payload.forEach((group: Group) => {
          groupsObject[group.id] = group;
        });
        state.groups = groupsObject;
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch groups";
        toast.error("Failed to fetch groups");
      })
      
      // Create group
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        // Add the new group to the state
        state.groups[action.payload.id] = action.payload;
        toast.success(`Group "${action.payload.name}" created successfully!`);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create group";
        toast.error("Failed to create group");
      })
      
      // Fetch group messages
      .addCase(fetchGroupMessages.fulfilled, (state, action) => {
        const { groupId, messages } = action.payload;
        state.messages[groupId] = messages;
      })
      
      // Fetch group invites
      .addCase(fetchGroupInvites.fulfilled, (state, action) => {
        const { username, invites } = action.payload;
        state.groupInvites[username] = invites;
      });
  },
});

export const {
  addGroup,
  removeGroup,
  setGroups,
  setGroupMessages,
  addGroupMessage,
  updateGroup,
  addGroupMember,
  updateGroupUsers,
  setGroupEvent,
  addExpense,
  updateGroupUser,
  // Group image caching actions
  cacheGroupImage,
  clearGroupImageCache,
  clearAllGroupImageCache,
  forceGroupImageRefresh,
  addGroupInvite,
  removeGroupInvite,
  setInviteStatus,
  removeInviteStatus,
  markGroupInvitesInvalid,
  markUserInvitesAsMember,
  updateMessageReadStatus,
  updateAllUserProfilePictures,
  setLoading
} = groupSlice.actions;
export const groupActions = groupSlice.actions;
export default groupSlice.reducer;
