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

    // Check if we've already processed this message
    if (processedMessageIds.has(messageKey)) {
      return;
    }

    // Add to processed set
    processedMessageIds.add(messageKey);
    if (data.message.id) {
      processedMessageIds.add(data.message.id);
    }

    // Normalize system messages to have consistent properties
    if (
      data.message.senderId === "system" ||
      (data.message as any).system === true
    ) {
      // Ensure the message has the type property set to 'system'
      data.message.type = "system";
    }

    // Add message to store
    store.dispatch(
      addMessage({
        chatId: data.chatId,
        message: data.message,
      })
    );
  });

  // Listen for group messages
  socket.on("new-group-message", (data: SocketMessageEvent) => {
    // Skip if no data or if we've already processed this message
    if (
      !data.groupId ||
      !data.message ||
      (data.message.id && processedMessageIds.has(data.message.id))
    ) {
      return;
    }

    // Create a unique key for this message even if it doesn't have an ID
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

    // Normalize system messages to have consistent properties
    if (
      data.message.senderId === "system" ||
      (data.message as any).system === true
    ) {
      // Ensure the message has the type property set to 'system'
      data.message.type = "system";
    }

    // Add message to store
    store.dispatch(
      groupActions.addGroupMessage({
        groupId: data.groupId,
        message: data.message,
      })
    );
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

    toast.success("Event updated successfully");
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
  socket.on("expense-updated", (data: { groupId: string; expense: any }) => {
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
      invitedBy: string;
      timestamp: string;
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
            `👥 Received group invite to ${data.groupName} from ${data.invitedBy}`
          );

          // Add the invite to Redux
          store.dispatch(
            addGroupInvite({
              username: currentUsername,
              invite: {
                id: data.id,
                groupId: data.groupId,
                groupName: data.groupName,
                invitedBy: data.invitedBy,
              },
            })
          );

          // Show a unique toast notification
          const notificationKey = `group-invite-${data.groupId}-${
            data.invitedBy
          }-${Date.now().toString().slice(0, -3)}`;
          showUniqueToast(
            notificationKey,
            `${data.invitedBy} invited you to join ${data.groupName}`
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
        // Call the function directly instead of dispatching it
        updateProfilePictureSocket(data.username, data.imageUrl);

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

  return () => {
    socket.off("new-message");
    socket.off("new-group-message");
    socket.off("new-friend-request");
    socket.off("friend-request-sent-success");
    socket.off("friend-added");
    socket.off("request-accepted");
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
    socket.emit("leave", username);
  };
};

export const sendMessage = async (messageData: Message): Promise<Message> => {
  try {
    // Add timestamp if not present
    if (!messageData.timestamp) {
      messageData.timestamp = new Date().toISOString();
    }

    // Add a temporary ID to track this message if not present
    if (!messageData.id) {
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      messageData.id = tempId;
    }

    // Create a unique key for this message to prevent duplicates
    const messageKey = `${messageData.chatId}_${messageData.content}_${messageData.timestamp}`;

    // Check if we've already processed this message in the last few seconds
    if (processedMessageIds.has(messageKey)) {
      console.log(`Skipping duplicate message send: ${messageKey}`);
      return messageData;
    }

    // Add to processed set to prevent duplicates
    processedMessageIds.add(messageKey);
    processedMessageIds.add(messageData.id);

    // Add message to store immediately for real-time updates
    if (messageData.chatId.startsWith("group_")) {
      const groupId = messageData.chatId.replace("group_", "");
      store.dispatch(
        groupActions.addGroupMessage({
          groupId,
          message: messageData,
        })
      );
    } else {
      store.dispatch(
        addMessage({
          chatId: messageData.chatId,
          message: messageData,
        })
      );
    }

    // Emit the message via socket
    const socket = getSocket();
    if (messageData.chatId.startsWith("group_")) {
      socket.emit("group-message", {
        groupId: messageData.chatId.replace("group_", ""),
        message: messageData,
      });
    } else {
      socket.emit("private-message", {
        chatId: messageData.chatId,
        message: messageData,
      });
    }

    // Remove from processed set after a delay to allow showing the same message again later
    setTimeout(() => {
      processedMessageIds.delete(messageKey);
    }, 5000); // 5 second cooldown

    return messageData;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Helper function for sending friend requests
export const sendFriendRequest = (data: {
  sender: string;
  recipient: string;
}) => {
  socket.emit("friend-request-sent", data);
};

export const acceptFriendRequest = (data: {
  sender: string;
  recipient: string;
}) => {
  socket.emit("friend-request-accepted", data);
};

export const declineFriendRequest = (data: {
  sender: string;
  recipient: string;
}) => {
  socket.emit("friend-request-declined", data);
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
  invitedBy: string;
}) => {
  if (!data.invitedBy) {
    console.error("No invitedBy provided for group invite");
    return;
  }
  socket.emit("group-invite", data);
};

// Add helper functions for emitting event updates
export const updateEvent = (
  groupId: string,
  event: Omit<Event, "updatedAt"> | null
) => {
  socket.emit("event-update", {
    groupId,
    event: event
      ? {
          ...event,
          id: event.id || Date.now().toString(),
          expenses: event.expenses || [],
        }
      : null,
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
  const currentUser = store.getState().user.username;

  console.log(`Adding expense: ${expense.item} for $${expense.amount}`);

  // If there's only one person to split with, create a single expense
  if (expense.splitBetween.length === 1) {
    const expenseData = {
      // Use itemName consistently
      itemName: expense.item, // Convert from item to itemName
      amount: expense.amount,
      addedBy: expense.paidBy, // Use paidBy as addedBy to track who paid
      date: new Date().toISOString(),
      // Additional metadata for server processing
      _debtor: expense.splitBetween[0], // Store who this expense is for
    };

    console.log("Sending expense data to server:", expenseData);

    // Send to server
    socket.emit("add-expense", {
      groupId,
      expense: expenseData,
      keepEventOpen: true,
    });
    return;
  }

  // For multiple people, create separate expenses for each person
  const amountPerPerson = expense.amount / expense.splitBetween.length;

  // Create and send an expense for each person in the splitBetween array
  expense.splitBetween.forEach((person) => {
    const expenseData = {
      // Use itemName consistently
      itemName: expense.item, // Convert from item to itemName
      amount: amountPerPerson, // Divide the amount by the number of people
      addedBy: expense.paidBy, // Use paidBy as addedBy to track who paid
      date: new Date().toISOString(),
      // Additional metadata for server processing
      _debtor: person, // Store who this specific expense is for
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

export const updateExpense = (groupId: string, updatedExpense: any) => {
  const socket = getSocket();
  socket.emit("update-expense", {
    groupId,
    expense: updatedExpense,
  });
};

export const removeExpense = (
  groupId: string,
  expense: any,
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
export const sendSocketEvent = (eventData: any) => {
  if (!socket.connected) {
    console.warn("Socket not connected, event not sent:", eventData.type);
    return;
  }

  // Log important user actions with emojis for better visibility
  switch (eventData.type) {
    case "friend-request-sent":
      console.log(`👋 Friend request sent to: ${eventData.recipient}`);
      break;
    case "friend-request-accepted":
      console.log(`✅ Friend request accepted: ${eventData.sender}`);
      break;
    case "friend-request-declined":
      console.log(`❌ Friend request declined: ${eventData.sender}`);
      break;
    case "group-invite":
      console.log(
        `👥 Group invite sent to: ${eventData.username} for group: ${eventData.groupId}`
      );
      break;
    case "group-join":
      console.log(`🎉 User joined group: ${eventData.groupId}`);
      break;
    case "event-update":
      console.log(`📅 Event updated for group: ${eventData.groupId}`);
      break;
    case "expense-added":
      console.log(`💰 Expense added to group: ${eventData.groupId}`);
      break;
  }

  socket.emit(eventData.type, eventData);
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
