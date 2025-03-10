import io from "socket.io-client";
import { SOCKET_URL } from "../config/api";
import { store } from "../store/store";
import {
  setFriends,
  setPendingRequests,
  setSentRequests,
} from "../store/slice/friendsSlice";
import { addMessage } from "../store/slice/chatSlice";
import { toast } from "react-hot-toast";
import {
  Message,
  SocketMessageEvent,
  SocketErrorEvent,
  FriendRequestEvent,
} from "../types/messageTypes";
import { groupActions } from "../store/slice/groupSlice";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { Event } from "../types/groupTypes";
import {
  setVenmoUsername,
  updateProfilePicture,
} from "../store/slice/userSlice";
import {
  addNotification,
  notificationMarkedRead,
  allNotificationsMarkedRead,
  setNotifications,
  allNotificationsCleared,
} from "../store/slice/notificationsSlice";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Group, Expense } from "../types/groupTypes";
import { Notification } from "../types/sidebarTypes";
import {
  addGroupInvite,
  setInviteStatus,
  removeGroupInvite,
  InviteStatus,
} from "../store/slice/groupSlice";
import { forceRefreshGroupImages } from "./imageUploadService";
import { Dispatch, AnyAction } from 'redux';

const socket = io(SOCKET_URL);

interface SocketData {
  type: string;
  payload: unknown;
  sender?: string;
  senderProfile?: string | null;
}

// Define the Friend interface locally
interface Friend {
  username: string;
  profilePicture: string | null;
}

// Set to track processed notifications to prevent duplicates
const processedNotifications = new Set<string>();

// Set to track processed message IDs to prevent duplicates
const processedMessageIds = new Set<string>();

// Move these outside the initializeSocket function
export const clearAllNotifications = createAsyncThunk(
  "notifications/clearAllNotifications",
  async (username: string) => {
    socket.emit("clear-all-notifications", { username });
    return;
  }
);

// Create a Set to track recently shown notifications
const recentNotifications = new Set<string>();

// Helper function to prevent duplicate notifications
export const showUniqueToast = (
  key: string,
  message: string,
  type: "success" | "error" = "success"
) => {
  // Make the key more unique by adding a timestamp component that changes every second
  // This prevents multiple identical notifications in quick succession
  const timeComponent = Math.floor(Date.now() / 1000);
  const uniqueKey = `${key}_${timeComponent}`;

  // Check if we've shown this notification recently
  if (!recentNotifications.has(uniqueKey)) {
    // Add to recent notifications
    recentNotifications.add(uniqueKey);

    // Show the toast
    if (type === "success") {
      toast.success(message, {
        id: uniqueKey, // Use the unique key as the toast ID
        duration: 3000,
      });
    } else {
      toast.error(message, {
        id: uniqueKey, // Use the unique key as the toast ID
        duration: 3000,
      });
    }

    // Remove from set after a delay to allow showing the same notification again later
    setTimeout(() => {
      recentNotifications.delete(uniqueKey);
    }, 5000); // 5 second cooldown
  }
};

export const initializeSocket = (username: string) => {
  socket.emit("join", username);

  // Friend request events with real-time updates
  socket.on("new-friend-request", (data: FriendRequestEvent) => {
    if (!data.id) return; // Skip if no ID

    const currentUser = store.getState().user.username;

    if (currentUser === data.recipient) {
      // Create a new request object with the sender's profile picture
      const newRequest = {
        id: data.id,
        sender: data.sender,
        timestamp: data.timestamp,
        profilePicture: data.profilePicture, // This should be the sender's profile picture
      };

      // Dispatch just this single request - our reducer will handle deduplication
      store.dispatch(setPendingRequests([newRequest]));

      // Log new friend request
      console.log(`📩 New friend request received from: ${data.sender}`);

      // Use unique toast to prevent duplicates
      const notificationKey = `friend-request-received-${
        data.sender
      }-${Date.now().toString().slice(0, -3)}`;
      showUniqueToast(
        notificationKey,
        `New friend request from ${data.sender}`
      );
    }
  });

  socket.on("friend-request-sent-success", (data: FriendRequestEvent) => {
    if (!data.id) return;

    // Add the recipient's profile picture to the sent request
    store.dispatch(
      setSentRequests([
        {
          id: data.id,
          recipient: data.recipient,
          status: "pending",
          timestamp: data.timestamp,
          profilePicture: data.profilePicture, // This should be the recipient's profile picture
        },
      ])
    );

    // Log friend request sent
    console.log(`📤 Friend request sent to: ${data.recipient}`);

    // Use unique toast to prevent duplicates
    const notificationKey = `friend-request-sent-${data.recipient}-${Date.now()
      .toString()
      .slice(0, -3)}`;
    showUniqueToast(
      notificationKey,
      `Friend request sent to ${data.recipient}`
    );
  });

  socket.on("friend-request-accepted", (data: FriendRequestEvent) => {
    const currentUser = store.getState().user.username;
    const currentFriends = store.getState().friends.friends;

    // If I'm the sender, remove from sent requests
    if (currentUser === data.sender) {
      const sentRequests = store.getState().friends.sentRequests;
      const updatedRequests = sentRequests.filter(
        (req) => req.recipient !== data.recipient
      );

      store.dispatch(setSentRequests(updatedRequests));

      // Check if friend already exists before adding
      const friendExists = currentFriends.some(
        (friend) => friend.username === data.recipient
      );

      if (!friendExists) {
        // Add to friends list
        const newFriend = {
          username: data.recipient,
          profilePicture: data.recipientProfile || null,
        };

        // Use type assertion to ensure correct type
        const updatedFriends = [...currentFriends, newFriend] as Friend[];
        store.dispatch(setFriends(updatedFriends));
      }

      // Log friend request accepted (for sender)
      console.log(`✅ ${data.recipient} accepted your friend request`);

      // Use unique toast to prevent duplicates
      const notificationKey = `friend-request-accepted-by-${
        data.recipient
      }-${Date.now().toString().slice(0, -3)}`;
      showUniqueToast(
        notificationKey,
        `${data.recipient} accepted your friend request`
      );
    }

    // If I'm the recipient, remove from pending requests
    if (currentUser === data.recipient) {
      const pendingRequests = store.getState().friends.pendingRequests;
      const updatedRequests = pendingRequests.filter(
        (req) => req.sender !== data.sender
      );

      store.dispatch(setPendingRequests(updatedRequests));

      // Check if friend already exists before adding
      const friendExists = currentFriends.some(
        (friend) => friend.username === data.sender
      );

      if (!friendExists) {
        // Add to friends list
        const newFriend = {
          username: data.sender,
          profilePicture: data.senderProfile || null,
        };

        // Use type assertion to ensure correct type
        const updatedFriends = [...currentFriends, newFriend] as Friend[];
        store.dispatch(setFriends(updatedFriends));
      }

      // Log friend request accepted (for recipient)
      console.log(`✅ You accepted ${data.sender}'s friend request`);
    }
  });

  socket.on("friend-added", (data: SocketData) => {
    if (!data.sender) return; // Ensure sender is defined

    const currentFriends = store.getState().friends.friends;
    const newFriend = {
      username: data.sender,
      profilePicture: data.senderProfile || null,
    };

    const updatedFriends = [...currentFriends, newFriend];
    store.dispatch(setFriends(updatedFriends));
    toast.success("New friend added!");
  });

  socket.on("request-declined", (data: FriendRequestEvent) => {
    store.dispatch(
      setSentRequests([
        {
          id: data.id || Date.now().toString(),
          recipient: data.recipient,
          status: "declined",
          timestamp: data.timestamp,
          profilePicture: data.profilePicture,
        },
      ])
    );
    toast.error(`${data.recipient} declined your friend request`);
  });

  // Listen for direct messages
  socket.on("new-message", (data: SocketMessageEvent) => {
    // Skip if no chatId or if we've already processed this message
    if (
      !data.chatId ||
      !data.message ||
      (data.message.id && processedMessageIds.has(data.message.id))
    ) {
      return;
    }

    // Create a unique key for this message even if it doesn't have an ID
    const messageKey =
      data.message.id ||
      `${data.chatId}_${data.message.content}_${data.message.timestamp}`;

    // For system messages, don't check for duplicates
    if (data.message.senderId !== 'system' && processedMessageIds.has(messageKey)) {
      return;
    }

    // Add to processed set (only for non-system messages)
    if (data.message.senderId !== 'system') {
      processedMessageIds.add(messageKey);
      if (data.message.id) {
        processedMessageIds.add(data.message.id);
      }
    }

    // Add message to store
    store.dispatch(
      addMessage({
        chatId: data.chatId,
        message: {
          ...data.message,
          type: data.message.senderId === 'system' ? 'system' : (data.message.type || 'text')
        } as Message
      })
    );
  });

  // Listen for group messages
  socket.on("new-group-message", (data: SocketMessageEvent) => {
    // Skip if no data or if we've already processed this message
    if (
      !data.groupId ||
      !data.message
    ) {
      return;
    }

    // For system messages, don't check for duplicates and process immediately
    if (data.message.senderId === 'system') {
      store.dispatch(
        groupActions.addGroupMessage({
          groupId: data.groupId!,
          message: {
            ...data.message,
            type: 'system'
          } as Message
        })
      );
      return;
    }

    // For regular messages, check for duplicates
    if (data.message.id && processedMessageIds.has(data.message.id)) {
      return;
    }

    // Create a unique key for this message
    const messageKey =
      data.message.id ||
      `${data.groupId}_${data.message.content}_${data.message.timestamp}`;

    // Check if we've already processed this message
    if (processedMessageIds.has(messageKey)) {
      return;
    }

    // Add to processed set
    processedMessageIds.add(messageKey);
    if (data.message.id) {
      processedMessageIds.add(data.message.id);
    }

    // Add message to store
    store.dispatch(
      groupActions.addGroupMessage({
        groupId: data.groupId!,
        message: data.message
      })
    );
  });

  // Add a specific listener for system messages
  socket.on("system-message", (data: SocketMessageEvent) => {
    if (!data.message) return;

    const isGroupMessage = !!data.groupId;
    
    if (isGroupMessage) {
      store.dispatch(
        groupActions.addGroupMessage({
          groupId: data.groupId!,
          message: {
            ...data.message,
            type: 'system'
          } as Message
        })
      );
    } else if (data.chatId) {
      store.dispatch(
        addMessage({
          chatId: data.chatId,
          message: {
            ...data.message,
            type: 'system'
          } as Message
        })
      );
    }
  });

  // Add new group member joined listener
  socket.on(
    "group-member-joined",
    (data: { groupId: string; username: string }) => {
      // Update group members in Redux store
      store.dispatch(
        groupActions.addGroupMember({
          groupId: data.groupId,
          member: {
            username: data.username,
            profilePicture: null,
            isAdmin: false,
          },
        })
      );
    }
  );

  // Update the group-invite-accepted event handler
  socket.on(
    "group-invite-accepted",
    (data: {
      groupId: string;
      username: string;
      group?: Group;
      profilePicture?: string | null;
    }) => {
      const currentUser = store.getState().user.username;

      // Only show notification if the user joining is not the current user
      if (data.username !== currentUser) {
        console.log(`👥 ${data.username} joined the group: ${data.groupId}`);

        // Use the unique toast helper with a key based on the event data
        const notificationKey = `group-join-${data.username}-${
          data.groupId
        }-${Date.now().toString().slice(0, -3)}`;
        showUniqueToast(notificationKey, `${data.username} joined the group`);
      }

      // Handle the simplified format (from socket.js)
      if (!data.group && data.groupId) {
        // This is just a notification that someone joined a group
        // We don't need to add a new group to Redux in this case
        return;
      }

      // Handle the full format (from groups.js controller)
      if (data.group && data.groupId) {
        // Ensure the group has all required properties
        const validGroup = {
          ...data.group,
          id: data.groupId, // Ensure ID is set correctly
          isGroup: true as const, // Use const assertion to ensure it's the literal 'true'
          users: Array.isArray(data.group.users) ? data.group.users : [],
          name: data.group.name || "Unnamed Group",
          admin: data.group.admin || "",
          createdBy: data.group.createdBy || "",
          createdAt: data.group.createdAt || new Date().toISOString(),
          updatedAt: data.group.updatedAt || new Date().toISOString(),
          currentEvent: data.group.currentEvent || {
            id: "",
            title: "",
            date: "",
            description: "",
            expenses: [],
          },
        };

        // Add group to Redux store
        store.dispatch(groupActions.addGroup(validGroup));

        // Fetch messages for the group
        if (data.username === currentUser) {
          console.log(`🎉 You joined the group: ${validGroup.name}`);

          // Show a toast notification for the current user when they join a group
          const notificationKey = `you-joined-group-${
            validGroup.id
          }-${Date.now().toString().slice(0, -3)}`;
          showUniqueToast(notificationKey, `You joined ${validGroup.name}`);

          axios
            .get(`${BASE_URL}/api/groups/${data.groupId}/messages`)
            .then((response) => {
              store.dispatch(
                groupActions.setGroupMessages({
                  groupId: data.groupId,
                  messages: response.data,
                })
              );
              // Force a re-render of the groups list
              store.dispatch(
                groupActions.setGroups(
                  Object.values(store.getState().groups.groups)
                )
              );
            })
            .catch((error) => {
              console.error("Error fetching messages:", error);
            });
        }
      }
    }
  );

  // Add event-related socket events
  socket.on("event-updated", (data: { groupId: string; event: Event }) => {
    store.dispatch(
      groupActions.setGroupEvent({
        groupId: data.groupId,
        event: data.event,
      })
    );

    // Log event update
    if (data.event) {
      console.log(
        `📅 Event "${data.event.title}" updated for group: ${data.groupId}`
      );
    } else {
      console.log(`📅 Event removed from group: ${data.groupId}`);
    }
  });

  // Update the expense-added event handler
  socket.on(
    "expense-added",
    (data: {
      groupId: string;
      expenses: Expense[];
      keepEventOpen?: boolean;
    }) => {
      // Update the group with the new expenses
      if (data.groupId && data.expenses) {
        const currentState = store.getState();
        const group = currentState.groups.groups[data.groupId];

        if (group && group.currentEvent) {
          // Get current expenses
          const currentExpenses = [...(group.currentEvent.expenses || [])];

          // Filter out duplicates by ID
          const newExpenses = data.expenses.filter(
            (newExp) =>
              !currentExpenses.some(
                (existingExp) => existingExp.id === newExp.id
              )
          );

          // Only update if there are new expenses to add
          if (newExpenses.length > 0) {
            // Log new expenses added
            console.log(
              `💰 ${newExpenses.length} new expense(s) added to group: ${data.groupId}`
            );

            // Add new expenses
            const updatedExpenses = [...currentExpenses, ...newExpenses];

            // Update the entire event with the new expenses array
            store.dispatch(
              groupActions.setGroupEvent({
                groupId: data.groupId,
                event: {
                  ...group.currentEvent,
                  expenses: updatedExpenses,
                },
                keepEventOpen: data.keepEventOpen,
              })
            );
          }
        }
      }
    }
  );

  // Inside initializeSocket function, update the venmo_username_updated listener
  socket.on(
    "venmo_username_updated",
    (data: { username: string; venmoUsername: string }) => {
      const currentUser = store.getState().user.username;

      // Only update the Redux store if this is the current user's Venmo username
      if (data.username === currentUser) {
        store.dispatch(setVenmoUsername(data.venmoUsername));
      }

      // For group members, update their Venmo username in the groups state
      const groups = store.getState().groups.groups;

      Object.keys(groups).forEach((groupId) => {
        const group = groups[groupId];
        const userIndex = group.users.findIndex(
          (user) => user.username === data.username
        );

        if (userIndex !== -1) {
          store.dispatch(
            groupActions.updateGroupUser({
              groupId,
              user: {
                ...group.users[userIndex],
                venmoUsername: data.venmoUsername,
              },
            })
          );
        }
      });
    }
  );

  // Inside initializeSocket function, add these event listeners
  socket.on("expense-updated", (data: { groupId: string; expense: Expense }) => {
    console.log("Expense updated:", data);
    
    // Get the current event from the store
    const state = store.getState();
    const group = state.groups.groups[data.groupId];

    if (group?.currentEvent) {
      console.log(`Received expense update for ID: ${data.expense.id}`);

      // Create a new array of expenses with the updated expense
      const updatedExpenses = group.currentEvent.expenses.map((exp) => {
        if (exp.id === data.expense.id) {
          return data.expense;
        }
        return exp;
      });

      // Update the event in the store
      store.dispatch(
        groupActions.setGroupEvent({
          groupId: data.groupId,
          event: {
            ...group.currentEvent,
            expenses: updatedExpenses,
          },
        })
      );
    }
  });

  socket.on(
    "expense-removed",
    (data: { groupId: string; expenseId: string }) => {
      // Get the current event from the store
      const state = store.getState();
      const group = state.groups.groups[data.groupId];

      if (group?.currentEvent) {
        // Filter out the removed expense
        const updatedExpenses = group.currentEvent.expenses.filter(
          (exp) => exp.id !== data.expenseId
        );

        // Update the event in the store
        store.dispatch(
          groupActions.setGroupEvent({
            groupId: data.groupId,
            event: {
              ...group.currentEvent,
              expenses: updatedExpenses,
            },
          })
        );
      }
    }
  );

  // Update the 'user-added-to-group' event handler
  socket.on(
    "user-added-to-group",
    async ({ groupId, groupData }: { groupId: string; groupData?: Group }) => {
      try {
        // If we received full group data, use it directly
        if (groupData) {
          // Add the group to Redux store with the current event
          store.dispatch(
            groupActions.addGroup({
              ...groupData,
              isGroup: true,
              // Add missing required properties with default values
              admin: groupData.admin || "",
              createdBy: groupData.createdBy || "",
              createdAt: groupData.createdAt || new Date().toISOString(),
              updatedAt: groupData.updatedAt || new Date().toISOString(),
            })
          );

          // Explicitly set the event in the store to ensure it's properly loaded
          if (groupData.currentEvent) {
            store.dispatch(
              groupActions.setGroupEvent({
                groupId,
                event: groupData.currentEvent,
              })
            );
          }

          // Fetch messages for the group
          const messagesResponse = await axios.get(
            `${BASE_URL}/api/groups/${groupId}/messages`
          );
          store.dispatch(
            groupActions.setGroupMessages({
              groupId,
              messages: messagesResponse.data,
            })
          );

          toast.success(`You've been added to ${groupData.name}`);
        } else {
          // Fallback to the old approach if we didn't get full group data
          const response = await axios.get(`${BASE_URL}/api/groups/${groupId}`);
          const fetchedGroupData = response.data;

          store.dispatch(
            groupActions.addGroup({
              ...fetchedGroupData,
              isGroup: true,
              currentEvent: fetchedGroupData.currentEvent,
            })
          );

          // Fetch messages for the group
          const messagesResponse = await axios.get(
            `${BASE_URL}/api/groups/${groupId}/messages`
          );
          store.dispatch(
            groupActions.setGroupMessages({
              groupId,
              messages: messagesResponse.data,
            })
          );

          // Explicitly set the event
          if (fetchedGroupData.currentEvent) {
            store.dispatch(
              groupActions.setGroupEvent({
                groupId,
                event: fetchedGroupData.currentEvent,
              })
            );
          }

          toast.success(`You've been added to ${fetchedGroupData.name}`);
        }
      } catch (error) {
        console.error("Error processing group data:", error);
        toast.error("Failed to load group data");
      }
    }
  );

  // Add notification listener
  socket.on("notification", (notification: Notification) => {
    // Ensure the notification is marked as unread
    const unreadNotification = {
      ...notification,
      read: false,
    };

    // Store the notification in Redux
    store.dispatch(addNotification(unreadNotification));
  });

  // Add notification marked read listener
  socket.on("notification-marked-read", (data: { id: string }) => {
    // Only dispatch if we have a valid ID
    if (data && data.id) {
      store.dispatch(notificationMarkedRead(data));
    }
  });

  // Add all notifications marked read listener
  socket.on("all-notifications-marked-read", () => {
    store.dispatch(allNotificationsMarkedRead());
  });

  // Add this to your socket initialization
  socket.on("notifications-loaded", (notifications: Notification[]) => {
    store.dispatch(setNotifications(notifications));
  });

  // Just add the listener here, don't redeclare the action
  socket.on("all-notifications-cleared", () => {
    store.dispatch(allNotificationsCleared());
  });

  // Add this event handler to handle updated expenses
  socket.on(
    "expenses-updated",
    (data: { groupId: string; expenses: Expense[] }) => {
      if (data.groupId && data.expenses) {
        // Get the current group from the store
        const currentState = store.getState();
        const group = currentState.groups.groups[data.groupId];

        if (group && group.currentEvent) {
          // Log expenses update
          console.log(
            `💰 ${data.expenses.length} expenses updated in group: ${data.groupId}`
          );

          // Update the entire expenses array
          store.dispatch(
            groupActions.setGroupEvent({
              groupId: data.groupId,
              event: {
                ...group.currentEvent,
                expenses: data.expenses,
              },
              keepEventOpen: true,
            })
          );
        }
      }
    }
  );

  // Add this event handler to initializeSocket function
  socket.on(
    "group-invite",
    (data: {
      id: string;
      groupId: string;
      groupName: string;
      senderId: string;
      timestamp?: string;
    }) => {
      // Store the invite in Redux with proper error handling
      try {
        const currentUsername = store.getState().user.username;
        if (currentUsername) {
          // Create a unique key for this invite
          const inviteKey = `group-invite-${data.id}-${data.groupId}`;

          // Check if we've already processed this invite
          if (processedNotifications.has(inviteKey)) {
            console.log(`Skipping duplicate group invite: ${inviteKey}`);
            return;
          }

          // Mark this invite as processed
          processedNotifications.add(inviteKey);

          // Log the invite for debugging
          console.log(
            `👥 Received group invite to ${data.groupName} from ${data.senderId}`
          );

          // Add the invite to Redux
          store.dispatch(
            addGroupInvite({
              username: currentUsername,
              invite: {
                id: data.id,
                groupId: data.groupId,
                groupName: data.groupName,
                invitedBy: data.senderId,
              },
            })
          );

          // Show a unique toast notification
          const notificationKey = `group-invite-${data.groupId}-${
            data.senderId
          }-${Date.now().toString().slice(0, -3)}`;
          showUniqueToast(
            notificationKey,
            `${data.senderId} invited you to join ${data.groupName}`
          );

          // Initialize invite status
          store.dispatch(
            setInviteStatus({
              inviteId: data.id,
              status: "sent",
            })
          );
        }
      } catch (error) {
        console.error("Error processing group invite:", error);
      }
    }
  );

  // Add handler for invite status updates
  socket.on(
    "invite-status-updated",
    (data: { inviteId: string; status: InviteStatus; groupId: string }) => {
      try {
        console.log(
          `📝 Invite status updated: ${data.inviteId} -> ${data.status}`
        );

        // Update the invite status in Redux
        store.dispatch(
          setInviteStatus({
            inviteId: data.inviteId,
            status: data.status,
          })
        );

        // If the invite was accepted, we don't need to do anything else as the group-invite-accepted
        // event will handle adding the user to the group

        // If the invite was declined, we should remove it from the Redux store
        if (data.status === "declined") {
          const currentUsername = store.getState().user.username;
          if (currentUsername) {
            store.dispatch(
              removeGroupInvite({
                username: currentUsername,
                inviteId: data.inviteId,
              })
            );
          }
        }
      } catch (error) {
        console.error("Error handling invite status update:", error);
      }
    }
  );

  // Update the friend-request-removed event handler to also update sent requests
  socket.on(
    "friend-request-removed",
    (data: { sender: string; recipient: string }) => {
      console.log("Friend request removed event received:", data);
      const currentUser = store.getState().user.username;

      if (currentUser === data.recipient) {
        // If I'm the recipient, remove from pending requests
        const pendingRequests = store.getState().friends.pendingRequests;
        const updatedRequests = pendingRequests.filter(
          (req) => req.sender !== data.sender
        );

        console.log("Updating pending requests:", {
          before: pendingRequests.length,
          after: updatedRequests.length,
        });

        store.dispatch(setPendingRequests(updatedRequests));
      } else if (currentUser === data.sender) {
        // If I'm the sender, remove from sent requests
        const sentRequests = store.getState().friends.sentRequests;
        const updatedRequests = sentRequests.filter(
          (req) => req.recipient !== data.recipient
        );

        console.log("Updating sent requests:", {
          before: sentRequests.length,
          after: updatedRequests.length,
        });

        store.dispatch(setSentRequests(updatedRequests));
      }
    }
  );

  // Add these new event handlers
  socket.on(
    "sent-request-accepted",
    (data: { sender: string; recipient: string }) => {
      console.log("Sent request accepted event received:", data);
      const currentUser = store.getState().user.username;

      if (currentUser === data.sender) {
        // If I'm the sender, remove from sent requests
        const sentRequests = store.getState().friends.sentRequests;
        const updatedRequests = sentRequests.filter(
          (req) => req.recipient !== data.recipient
        );

        console.log("Updating sent requests after acceptance:", {
          before: sentRequests.length,
          after: updatedRequests.length,
        });

        store.dispatch(setSentRequests(updatedRequests));

        // Use unique toast to prevent duplicates
        const notificationKey = `sent-request-accepted-by-${
          data.recipient
        }-${Date.now().toString().slice(0, -3)}`;
        showUniqueToast(
          notificationKey,
          `${data.recipient} accepted your friend request`
        );
      }
    }
  );

  socket.on(
    "sent-request-declined",
    (data: { sender: string; recipient: string }) => {
      console.log("Sent request declined event received:", data);
      const currentUser = store.getState().user.username;

      if (currentUser === data.sender) {
        // If I'm the sender, remove from sent requests
        const sentRequests = store.getState().friends.sentRequests;
        const updatedRequests = sentRequests.filter(
          (req) => req.recipient !== data.recipient
        );

        console.log("Updating sent requests after decline:", {
          before: sentRequests.length,
          after: updatedRequests.length,
        });

        store.dispatch(setSentRequests(updatedRequests));

        // Use unique toast to prevent duplicates
        const notificationKey = `friend-request-declined-by-${
          data.recipient
        }-${Date.now().toString().slice(0, -3)}`;
        showUniqueToast(
          notificationKey,
          `${data.recipient} declined your friend request`,
          "error"
        );
      }
    }
  );

  // Add this to your socket service
  socket.on(
    "profile-picture-updated",
    (data: { username: string; imageUrl: string }) => {
      const currentUser = store.getState().user.username;

      // Update the current user's profile picture if it's their update
      if (currentUser === data.username) {
        // Then dispatch the Redux action separately
        store.dispatch(
          updateProfilePicture({
            username: data.username,
            imageUrl: data.imageUrl,
          })
        );
      }

      // Force a refresh of all avatars for this user
      const avatarElements = document.querySelectorAll(
        `[data-username="${data.username}"]`
      );
      avatarElements.forEach((el) => {
        const img = el.querySelector("img");
        if (img) {
          img.src = data.imageUrl + "?t=" + Date.now();
        }
      });
    }
  );

  // Add this socket event handler in the initializeSocket function after the other event handlers
  socket.on("group-updated", (data: { 
    groupId: string; 
    name?: string;
    imageUrl?: string;
    updatedBy?: string;
  }) => {
    console.log(`🔄 Group ${data.groupId} updated via direct message:`, data);
    
    if (data.groupId) {
      // Create update object with only the fields that were updated
      const updateObj: any = { id: data.groupId };
      if (data.name) {
        updateObj.name = data.name;
        console.log(`Setting group name to: ${data.name}`);
      }
      if (data.imageUrl) {
        updateObj.imageUrl = data.imageUrl;
        console.log(`Setting image URL to: ${data.imageUrl}`);
      }
      
      // Update the group in the Redux store
      store.dispatch(
        groupActions.updateGroup(updateObj)
      );
      
      // Force a re-render of the groups list by dispatching setGroups
      const currentGroups = store.getState().groups.groups;
      store.dispatch(groupActions.setGroups(Object.values(currentGroups)));
      
      // Show a toast notification
      let message = "";
      if (data.name && data.imageUrl) {
        message = data.updatedBy 
          ? `Group name and image updated by ${data.updatedBy}`
          : "Group name and image updated";
      } else if (data.name) {
        message = `Group name updated to "${data.name}"`;
      } else if (data.imageUrl) {
        message = data.updatedBy 
          ? `Group image updated by ${data.updatedBy}`
          : "Group image updated";
      }
      
      if (message) {
        showUniqueToast(
          `group-update-${data.groupId}`,
          message
        );
      }
      
      // If there's an image update, force refresh all group images with this ID
      if (data.imageUrl) {
        console.log(`Forcing refresh of all images for group ${data.groupId} via direct message`);
        // Use the imported function directly
        forceRefreshGroupImages(data.groupId, data.imageUrl);
      }
    }
  });

  // Add this socket event handler for the broadcast event
  socket.on("broadcast-group-update", (data: { 
    groupId: string; 
    name?: string; 
    imageUrl?: string;
    updatedBy: string; 
    members: string[] 
  }) => {
    console.log(`🔄 Received broadcast group update for ${data.groupId}:`, data);
    
    // Process for all users, regardless of membership
    const currentUser = store.getState().user.username;
    
    // Check if this update is relevant to this user
    const isRelevant = data.members.includes(currentUser);
    console.log(`Update is relevant to current user: ${isRelevant}`);
    
    if (isRelevant) {
      console.log(`Updating group ${data.groupId} for user ${currentUser}`);
      
      // Create update object with only the fields that were updated
      const updateObj: Partial<Group> & { id: string } = { id: data.groupId };
      if (data.name) updateObj.name = data.name;
      if (data.imageUrl) {
        updateObj.imageUrl = data.imageUrl;
        console.log(`Setting image URL to: ${data.imageUrl}`);
      }
      
      // Update the group in the Redux store
      store.dispatch(
        groupActions.updateGroup(updateObj)
      );
      
      // Force a re-render of the groups list by dispatching setGroups
      const currentGroups = store.getState().groups.groups;
      store.dispatch(groupActions.setGroups(Object.values(currentGroups)));
      
      // Show a toast notification only for other users
      if (data.updatedBy !== currentUser) {
        let message = "";
        if (data.name && data.imageUrl) {
          message = `Group name and image updated by ${data.updatedBy}`;
        } else if (data.name) {
          message = `Group name updated to "${data.name}" by ${data.updatedBy}`;
        } else if (data.imageUrl) {
          message = `Group image updated by ${data.updatedBy}`;
        }
        
        showUniqueToast(
          `group-update-${data.groupId}`,
          message
        );
      }
    }
    
    // If there's an image update, force refresh all group images with this ID
    // Do this regardless of membership to ensure all instances are updated
    if (data.imageUrl) {
      console.log(`Forcing refresh of all images for group ${data.groupId}`);
      // Use the imported function directly
      forceRefreshGroupImages(data.groupId, data.imageUrl);
    }
  });

  // Add socket listener for group message updates
  socket.on('group_message_update', (data: { 
    groupId: string, 
    messageId: string, 
    readBy: string[],
    isLatest: boolean 
  }) => {
    console.log('📖 Group message update received:', data);
    
    store.dispatch(
      groupActions.updateMessageReadStatus({
        groupId: data.groupId,
        messageId: data.messageId,
        readBy: data.readBy,
        isLatest: data.isLatest
      } as any)
    );
  });

  return () => {
    socket.off("new-message");
    socket.off("new-group-message");
    socket.off("new-friend-request");
    socket.off("friend-request-sent-success");
    socket.off("friend-added");
    socket.off("request-declined");
    socket.off("friend-request-removed");
    socket.off("sent-request-accepted");
    socket.off("sent-request-declined");
    socket.off("user-status-changed");
    socket.off("group-member-joined");
    socket.off("group-invite-accepted");
    socket.off("event-updated");
    socket.off("expense-added");
    socket.off("venmo_username_updated");
    socket.off("expense-updated");
    socket.off("expense-removed");
    socket.off("user-added-to-group");
    socket.off("notification");
    socket.off("notification-marked-read");
    socket.off("all-notifications-marked-read");
    socket.off("profile-picture-updated");
    socket.off("group-updated");
    socket.off("broadcast-group-update");
    socket.off("system-message");
    socket.emit("leave", username);
  };
};

// Update the sendMessage function to better handle system messages
export const sendMessage = async (
  messageData: Partial<Message> & {
    chatId: string;
    content: string;
    senderId: string;
  },
  options?: {
    dispatch?: Dispatch<AnyAction>;
    checkExisting?: (content: string) => boolean;
  }
): Promise<Message | null> => {
  try {
    // Create a mutable copy of the message data
    const mutableData = { ...messageData };
    
    // Determine if this is a group chat by checking if the chatId starts with 'group_'
    const isGroupChat = mutableData.chatId.startsWith('group_');
    
    // Extract the actual group ID if this is a group chat
    const actualChatId = isGroupChat 
      ? mutableData.chatId.replace('group_', '')
      : mutableData.chatId;
    
    // Set default type if not provided
    if (!mutableData.type) {
      mutableData.type = mutableData.senderId === 'system' ? 'system' : 'text';
    }
    
    // For system messages, skip duplicate check to ensure immediate display
    if (mutableData.senderId !== 'system' && isGroupChat && options?.checkExisting && options.checkExisting(mutableData.content)) {
      console.log(`Similar message already exists: ${mutableData.content}`);
      return null;
    }
    
    // Add timestamp if not present
    if (!mutableData.timestamp) {
      mutableData.timestamp = new Date().toISOString();
    }
    
    // Add a unique ID if not present
    if (!mutableData.id) {
      const idPrefix = mutableData.senderId === 'system' ? 'system' : mutableData.type;
      mutableData.id = `${idPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Set status if not present
    if (!mutableData.status) {
      mutableData.status = 'sent';
    }
    
    // Create the full message object
    const fullMessage: Message = {
      id: mutableData.id!,
      content: mutableData.content,
      senderId: mutableData.senderId,
      chatId: isGroupChat ? actualChatId : mutableData.chatId,
      timestamp: mutableData.timestamp!,
      status: mutableData.status!,
      type: mutableData.type!,
      readBy: mutableData.senderId === 'system' ? [] : [mutableData.senderId] // Don't track read status for system messages
    };
    
    // Add attachments if they exist
    if (mutableData.attachments) {
      fullMessage.attachments = mutableData.attachments;
    }
    
    // Get socket instance
    const socket = getSocket();
    
    // For system messages, dispatch immediately and emit socket event
    if (mutableData.senderId === 'system') {
      if (isGroupChat) {
        const dispatch = options?.dispatch || store.dispatch;
        dispatch(
          groupActions.addGroupMessage({
            groupId: actualChatId,
            message: fullMessage,
          })
        );
        
        // Emit as system-message instead of group-message
        socket.emit("system-message", {
          groupId: actualChatId,
          message: fullMessage
        });
      } else {
        store.dispatch(
          addMessage({
            chatId: mutableData.chatId,
            message: fullMessage
          })
        );
        
        // Emit as system-message instead of direct-message
        socket.emit("system-message", {
          chatId: mutableData.chatId,
          message: fullMessage
        });
      }
      
      return fullMessage;
    }
    
    // Handle regular messages as before
    if (isGroupChat) {
      const dispatch = options?.dispatch || store.dispatch;
      dispatch(
        groupActions.addGroupMessage({
          groupId: actualChatId,
          message: fullMessage,
        })
      );
      
      socket.emit("group-message", {
        groupId: actualChatId,
        message: fullMessage,
      });
    } else {
      // For direct messages, ensure we're using the correct friendship ID
      const users = fullMessage.chatId.split('_');
      let sender = fullMessage.senderId;
      let recipient = users.length === 2 ? users.find(u => u !== sender) : fullMessage.chatId;
      const friendshipId = [sender, recipient].sort().join('_');
      
      const messageWithCorrectChatId = {
        ...fullMessage,
        chatId: friendshipId
      };
      
      store.dispatch(
        addMessage({
          chatId: friendshipId,
          message: messageWithCorrectChatId,
        })
      );
      
      socket.emit("direct-message", {
        chatId: friendshipId,
        message: messageWithCorrectChatId,
      });
      
      return messageWithCorrectChatId;
    }
    
    return fullMessage;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Helper function to generate a friendship ID
export const generateFriendshipId = (user1: string, user2: string): string => {
  return [user1, user2].sort().join('_');
};

// Helper function for sending friend requests
export const sendFriendRequest = (data: {
  sender: string;
  recipient: string;
}) => {
  const friendshipId = generateFriendshipId(data.sender, data.recipient);
  socket.emit("friend-request-sent", {
    ...data,
    friendshipId
  });
};

// Helper function for accepting friend requests
export const acceptFriendRequest = (data: {
  sender: string;
  recipient: string;
}) => {
  const friendshipId = generateFriendshipId(data.sender, data.recipient);
  socket.emit("friend-request-accepted", {
    ...data,
    friendshipId
  });
};

// Helper function for declining friend requests
export const declineFriendRequest = (data: {
  sender: string;
  recipient: string;
}) => {
  const friendshipId = generateFriendshipId(data.sender, data.recipient);
  socket.emit("friend-request-declined", {
    ...data,
    friendshipId
  });
};

// Add error handler
socket.on("message-error", (error: SocketErrorEvent) => {
  console.error("Message error:", error);
  toast.error("Failed to send message");
});

// Add a helper function to send group invites
export const sendGroupInvite = (data: {
  groupId: string;
  username: string;
  senderId: string;
}) => {
  if (!data.senderId) {
    console.error("No senderId provided for group invite");
    return;
  }
  socket.emit("group-invite", data);
};

// Helper function to format a date in YYYY-MM-DD format
const formatDateToYYYYMMDD = (dateString?: string): string => {
  // If the date is already in YYYY-MM-DD format, return it as is
  if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Parse the date string or use current date
  const date = dateString ? new Date(dateString) : new Date();
  
  // Get the UTC values to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
};

// Add helper functions for emitting event updates
export const updateEvent = (
  groupId: string,
  event: Omit<Event, "updatedAt"> | null
) => {
  // Ensure the date is in the correct format
  const formattedEvent = event
    ? {
        ...event,
        id: event.id || Date.now().toString(),
        expenses: event.expenses || [],
        // Ensure the date is in YYYY-MM-DD format using our helper function
        date: event.date ? formatDateToYYYYMMDD(event.date) : formatDateToYYYYMMDD(),
      }
    : null;

  socket.emit("event-update", {
    groupId,
    event: formattedEvent,
  });
};

export const addExpense = (
  groupId: string,
  expense: {
    item: string;
    amount: number;
    paidBy: string;
    splitBetween: string[];
  }
) => {
  const socket = getSocket();

  console.log(`Adding expense: ${expense.item} for $${expense.amount}`);

  // Filter out the payer from splitBetween to avoid creating an expense where payer owes themselves
  const filteredSplitBetween = expense.splitBetween.filter(
    (person) => person !== expense.paidBy
  );

  // If no one is left after filtering, return early
  if (filteredSplitBetween.length === 0) {
    console.log("No valid debtors after filtering out the payer");
    return;
  }

  // Calculate the amount per person based on the ORIGINAL split list
  // This ensures the math is correct even when the payer is included in the split
  const amountPerPerson = expense.amount / expense.splitBetween.length;

  // Create and send an expense for each person in the filtered splitBetween array
  filteredSplitBetween.forEach((person) => {
    const expenseData = {
      // Convert to the new Expense format
      itemName: expense.item,
      amount: amountPerPerson, // Split amount equally among all participants
      addedBy: expense.paidBy,
      date: new Date().toISOString(),
      // Additional metadata for server processing
      _debtor: person,
    };

    console.log(`Sending split expense for ${person}:`, expenseData);

    // Send to server
    socket.emit("add-expense", {
      groupId,
      expense: expenseData,
      keepEventOpen: true,
    });
  });
};

export const getSocket = () => socket;

// Update the updateVenmoUsername function
export const updateVenmoUsername = async (
  username: string,
  venmoUsername: string
) => {
  try {
    // First make the API call
    await axios.put(`${BASE_URL}/api/users/${username}`, {
      venmoUsername,
    });

    // Then emit the socket event to all connected clients
    socket.emit("update_venmo_username", { username, venmoUsername });

    // Update local Redux store immediately (don't wait for the socket event)
    store.dispatch(setVenmoUsername(venmoUsername));

    // Also update the user in any groups they're a part of
    const groups = store.getState().groups.groups;
    Object.keys(groups).forEach((groupId) => {
      const group = groups[groupId];
      const userIndex = group.users.findIndex(
        (user) => user.username === username
      );

      if (userIndex !== -1) {
        store.dispatch(
          groupActions.updateGroupUser({
            groupId,
            user: {
              ...group.users[userIndex],
              venmoUsername,
            },
          })
        );
      }
    });

    return true;
  } catch (error) {
    console.error("Error updating Venmo username:", error);
    throw error;
  }
};

export const updateExpense = (groupId: string, updatedExpense: Expense) => {
  const socket = getSocket();
  socket.emit("update-expense", {
    groupId,
    expense: updatedExpense,
  });
};

export const removeExpense = (
  groupId: string,
  expense: Expense,
  itemIndex?: number
) => {
  const socket = getSocket();

  // If itemIndex is provided, we're removing a single item
  if (itemIndex !== undefined) {
    socket.emit("remove-expense-item", {
      groupId,
      expenseId: expense.id,
      itemIndex,
    });
  } else {
    // Otherwise remove the entire expense
    socket.emit("remove-expense", {
      groupId,
      expense,
    });
  }
};

// Add this function to mark a notification as read via socket
export const markNotificationRead = (
  username: string,
  notificationId: string
) => {
  socket.emit("mark-notification-read", { username, notificationId });
};

// Add this function to mark all notifications as read
export const markAllNotificationsRead = (username: string) => {
  socket.emit("mark-all-notifications-read", { username });
};

// Add this function to fetch notifications
export const fetchUserNotifications = (username: string) => {
  socket.emit("fetch-notifications", username);
};

// Add this function to update existing expenses
export const updateExistingExpenses = (groupId: string) => {
  const socket = getSocket();
  socket.emit("update-existing-expenses", {
    groupId,
    useDebtorFormat: true, // Signal to the server to use the new format
  });
};

// Add this function for group room management
interface SocketEventData {
  type: string;
  payload: unknown;
  [key: string]: unknown;
}

export const sendSocketEvent = (eventData: SocketEventData) => {
  const socket = getSocket();
  socket.emit(eventData.type, eventData.payload);
};

// Add this to your socket service
export const updateProfilePictureSocket = (
  username: string,
  imageUrl: string
) => {
  try {
    // Emit the profile picture update to all connected clients
    const socket = getSocket();
    socket.emit("profile-picture-updated", { username, imageUrl });
  } catch (error) {
    console.error("Error updating profile picture:", error);
  }
};

// Add a function to update the group name
export const updateGroupName = async (groupId: string, name: string, username: string) => {
  try {
    // Make API call to update the group name
    const response = await axios.put(`${BASE_URL}/api/groups/${groupId}/update`, {
      adminId: username, // Using adminId parameter for backward compatibility
      name
    });

    if (response.status === 200) {
      // Get the current group data to get the members
      const currentState = store.getState();
      const groupData = currentState.groups.groups[groupId];
      
      // Get all users in the group
      const members = groupData?.users?.map(user => user.username) || [];
      
      // Update the Redux store immediately for the current user
      store.dispatch(
        groupActions.updateGroup({
          id: groupId,
          name
        })
      );
      
      // Force a re-render of the groups list by dispatching setGroups
      const updatedGroups = store.getState().groups.groups;
      store.dispatch(groupActions.setGroups(Object.values(updatedGroups)));

      // Emit socket event to notify other users
      // Use a different event name that will be broadcast to all users
      socket.emit("broadcast-group-update", {
        groupId,
        name,
        updatedBy: username,
        members
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating group name:", error);
    throw error;
  }
};

// Add this function to update group images
export const updateGroupImage = async (groupId: string, imageUrl: string, username: string) => {
  try {
    // Get the current group data to get the members
    const currentState = store.getState();
    const groupData = currentState.groups.groups[groupId];
    
    if (!groupData) {
      console.error("Group not found in store:", groupId);
      return false;
    }
    
    // Get all users in the group
    const members = groupData.users.map(user => user.username);
    
    // Update the Redux store immediately for the current user
    store.dispatch(
      groupActions.updateGroup({
        id: groupId,
        imageUrl
      })
    );
    
    // Force a re-render of the groups list by dispatching setGroups
    const updatedGroups = store.getState().groups.groups;
    store.dispatch(groupActions.setGroups(Object.values(updatedGroups)));
    
    // Emit socket event to notify other users
    socket.emit("broadcast-group-update", {
      groupId,
      imageUrl,
      updatedBy: username,
      members
    });
    
    return true;
  } catch (error) {
    console.error("Error updating group image:", error);
    throw error;
  }
};

// Add these helper functions near the top of the file
const getLastMessageId = (messages: Message[]): string | null => {
  // Get the last non-system message
  const lastMessage = [...messages].reverse().find(m => m.type !== 'system');
  return lastMessage?.id || null;
};

// Update the markMessagesAsRead function to handle all messages up to the last one
export const markMessagesAsRead = (chatId: string, userId: string, messages: Message[]) => {
  const socket = getSocket();
  
  // For group messages
  if (chatId.startsWith('group_')) {
    const groupId = chatId.replace('group_', '');
    socket.emit('mark-messages-read', {
      groupId,
      userId,
      messageIds: messages.map(m => m.id)
    });
  } else {
    // For direct messages (existing code)
    const lastMessageId = getLastMessageId(messages);
    if (!lastMessageId) return;
    
    socket.emit('mark-messages-read', {
      chatId,
      userId,
      messageId: lastMessageId
    });
  }
};

// Update the socket event handler for message-read events
socket.on('message-read', (data: { 
  chatId: string, 
  messageId: string,
  messageIds?: string[],
  readBy: string[] 
}) => {
  console.log('👀 Message read event received:', data);
  
  const isGroupMessage = data.chatId.startsWith('group_');
  const normalizedChatId = isGroupMessage ? data.chatId.replace('group_', '') : data.chatId;
  
  // Update the read status for all messages
  if (data.messageIds) {
    data.messageIds.forEach(messageId => {
      if (isGroupMessage) {
        store.dispatch(
          groupActions.updateMessageReadStatus({
            groupId: normalizedChatId,
            messageId,
            readBy: data.readBy
          } as any)
        );
      } else {
        store.dispatch(
          updateMessageReadStatus({
            chatId: data.chatId,
            messageId,
            readBy: data.readBy
          })
        );
      }
    });
  }
});

// Update the loadReadReceipts function to handle last read message
export const loadReadReceipts = (groupId: string): Record<string, string[]> => {
  try {
    // For now, return an empty object as we'll implement the actual storage later
    return {};
  } catch (error) {
    console.error('Error loading read receipts:', error);
    return {};
  }
};
