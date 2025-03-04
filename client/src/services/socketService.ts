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
import { addGroupInvite, setInviteStatus } from "../store/slice/groupSlice";

const socket = io(SOCKET_URL);

interface SocketData {
  type: string;
  payload: unknown;
  // add other socket data properties
}

// Move these outside the initializeSocket function
export const clearAllNotifications = createAsyncThunk(
  "notifications/clearAllNotifications",
  async (username: string) => {
    socket.emit("clear-all-notifications", { username });
    return;
  }
);

export const initializeSocket = (username: string) => {
  socket.emit("join", username);

  // Track message IDs we've already processed
  const processedMessageIds = new Set<string>();

  // Friend request events with real-time updates
  socket.on("new-friend-request", (data: FriendRequestEvent) => {
    if (!data.id) return; // Skip if no ID

    const currentUser = store.getState().user.username;

    if (currentUser === data.recipient) {
      // Create a new request object
      const newRequest = {
        id: data.id,
        sender: data.sender,
        timestamp: data.timestamp,
        profilePicture: data.profilePicture,
      };

      // Dispatch just this single request - our reducer will handle deduplication
      store.dispatch(setPendingRequests([newRequest]));

      toast.success(`New friend request from ${data.sender}`);
    }
  });

  socket.on("friend-request-sent-success", (data: FriendRequestEvent) => {
    if (!data.id) return;

    store.dispatch(
      setSentRequests([
        {
          id: data.id,
          recipient: data.recipient,
          status: "pending",
          timestamp: data.timestamp,
          profilePicture: data.profilePicture,
        },
      ])
    );
    toast.success(`Friend request sent to ${data.recipient}`);
  });

  socket.on("friend-request-accepted", (data: FriendRequestEvent) => {
    const currentUser = store.getState().user.username;

    // If I'm the sender, remove from sent requests
    if (currentUser === data.sender) {
      const sentRequests = store.getState().friends.sentRequests;
      const updatedRequests = sentRequests.filter(
        (req) => req.recipient !== data.recipient
      );

      console.log("Friend request accepted - Updating sent requests:", {
        before: sentRequests.length,
        after: updatedRequests.length,
      });

      store.dispatch(setSentRequests(updatedRequests));

      // Also add to friends list
      store.dispatch(
        setFriends([
          ...store.getState().friends.friends,
          {
            username: data.recipient,
            profilePicture: data.recipientProfile || null,
          },
        ])
      );
    }

    // If I'm the recipient, remove from pending requests
    if (currentUser === data.recipient) {
      const pendingRequests = store.getState().friends.pendingRequests;
      const updatedRequests = pendingRequests.filter(
        (req) => req.sender !== data.sender
      );

      console.log("Friend request accepted - Updating pending requests:", {
        before: pendingRequests.length,
        after: updatedRequests.length,
      });

      store.dispatch(setPendingRequests(updatedRequests));

      // Also add to friends list
      store.dispatch(
        setFriends([
          ...store.getState().friends.friends,
          {
            username: data.sender,
            profilePicture: data.senderProfile || null,
          },
        ])
      );
    }
  });

  socket.on("friend-added", (data: SocketData) => {
    store.dispatch(setFriends(data));
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
      (data.message.id && processedMessageIds.has(data.message.id))
    ) {
      return;
    }

    // Add to processed set if it has an ID
    if (data.message.id) {
      processedMessageIds.add(data.message.id);
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
    // Skip if we've already processed this message
    if (data.message.id && processedMessageIds.has(data.message.id)) {
      return;
    }

    // Add to processed set if it has an ID
    if (data.message.id) {
      processedMessageIds.add(data.message.id);
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
    (data: { groupId: string; username: string; group: Group }) => {
      const currentUser = store.getState().user.username;

      // Add group directly since server sends correctly formatted data
      store.dispatch(
        groupActions.addGroup({
          ...data.group,
          isGroup: true,
        })
      );

      // Fetch messages for the group
      if (data.username === currentUser) {
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

      // Show toast notification
      if (data.username !== currentUser) {
        toast.success(`${data.username} joined the group`);
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
        console.log("Received expense-added event:", data);

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

            console.log("Updated Redux store with new expenses:", newExpenses);
          } else {
            console.log("No new expenses to add (duplicates filtered out)");
          }
        }
      }
    }
  );

  // Inside initializeSocket function, update the venmo_username_updated listener
  socket.on(
    "update_venmo_username",
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
      // Create a new array of expenses with the updated expense
      const updatedExpenses = group.currentEvent.expenses.map((exp) => {
        if (
          exp.id === data.expense.id ||
          (exp.item === data.expense.originalItem &&
            exp.paidBy === data.expense.paidBy)
        ) {
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

          console.log("Updated expenses from server:", data.expenses);
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

          // Initialize invite status
          store.dispatch(
            setInviteStatus({
              inviteId: data.id,
              status: "loading",
            })
          );

          // Show a notification
          toast.success(`You've been invited to join ${data.groupName}`);
        }
      } catch (error) {
        console.error("Error processing group invite:", error);
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
        toast.success(`${data.recipient} accepted your friend request`);
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

  // Create a single expense with the full splitBetween array
  const expenseData = {
    item: expense.item,
    amount: expense.amount,
    paidBy: expense.paidBy,
    addedBy: currentUser,
    splitBetween: expense.splitBetween, // Keep the full array
    date: new Date().toISOString(),
  };

  // Send to server
  socket.emit("add-expense", {
    groupId,
    expense: expenseData,
    keepEventOpen: true,
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

    // Update local Redux store
    store.dispatch(setVenmoUsername(venmoUsername));

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
  socket.emit("update-existing-expenses", { groupId });
};

// Add this function for group room management
export const sendSocketEvent = (eventData: any) => {
  console.log(`Sending socket event: ${eventData.type}`, eventData);
  const socket = getSocket();
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
