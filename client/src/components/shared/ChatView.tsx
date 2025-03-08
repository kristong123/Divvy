import React, { useState, useRef, useEffect, useMemo } from "react";
import clsx from "clsx";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { toast } from "react-hot-toast";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import {
  sendMessage,
  getSocket,
  updateEvent,
  sendSocketEvent,
  updateGroupName,
  generateFriendshipId,
} from "../../services/socketService";
import {
  addMessage,
  setMessages,
  setLoading,
} from "../../store/slice/chatSlice";
import { SocketMessageEvent, Message } from "../../types/messageTypes";
import ProfileFrame from "./ProfileFrame";
import EditableGroupImage from "./EditableGroupImage";
import { UserPlus, ArrowLeft, Calendar } from "lucide-react";
import GroupMembers from "../groupchats/GroupMembers";
import InviteModal from "../modals/GroupInviteModal";
import { createSelector } from "@reduxjs/toolkit";
import * as groupActions from "../../store/slice/groupSlice";
import { Event, Group } from "../../types/groupTypes";
import GroupInvite from "../groupchats/GroupInvite";
import AddEventButton from "../groupchats/events/AddEventButton";
import EventDetailsView from "../groupchats/events/EventDetailsView";
import { markAsRead } from "../../store/slice/notificationsSlice";
import ClickInput from "./ClickInput";
import { forceRefreshGroupImages } from "../../services/imageUploadService";
import {useTheme} from '../../context/ThemeContext';

interface ChatViewProps {
  chat: {
    id: string;
    name: string;
    imageUrl?: string;
    amount?: string; // For group chats
    lastMessage?: string; // For direct messages
    isGroup?: boolean;
    notificationType?: string;
  };
}

// Add interface for group data
interface GroupJoinData {
  groupId: string;
  username?: string; // Add username property
  group: {
    id: string;
    name: string;
    users: Array<{
      username: string;
      profilePicture: string | null;
      isAdmin: boolean;
      venmoUsername?: string;
    }>;
    currentEvent?: Event;
    // add other group properties you need
  };
}

// Add this interface near the top of the file with other interfaces
interface GroupUpdateData {
  groupId: string;
  name?: string;
  imageUrl?: string;
  updatedBy?: string;
  members?: string[];
}

// Create a stable selector outside the component
const selectChatMessages = createSelector(
  [
    (state: RootState) => state.groups.messages,
    (state: RootState) => state.chat.messages,
  ],
  (groupMessages, chatMessages) => ({ groupMessages, chatMessages })
);

// Update the helper function to properly handle timezone issues
const formatDateForInput = (dateString: string): string => {
  // If the date is already in YYYY-MM-DD format, return it as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Parse the date string and create a new Date object
  const date = new Date(dateString);

  // Get the UTC values to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(date.getUTCDate()).padStart(2, "0");

  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
};

// Update the helper function for displaying dates
const formatDateForDisplay = (dateString: string): string => {
  // Parse the date string
  const date = new Date(dateString);

  // Use toLocaleDateString with explicit options to avoid timezone issues
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // Use UTC to avoid timezone shifts
  });
};

const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
  const { theme } = useTheme();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  const currentUser = useSelector((state: RootState) => state.user.username);

  const chatId = useMemo(
    () =>
      chat.isGroup
        ? `group_${chat.id}`
        : generateFriendshipId(currentUser, chat.name),
    [currentUser, chat.name, chat.id, chat.isGroup]
  );

  // Use the stable selector
  const { groupMessages, chatMessages } = useSelector(selectChatMessages);

  // Then extract the messages we need
  const messages = useMemo(
    () =>
      chat.isGroup ? groupMessages[chat.id] || [] : chatMessages[chatId] || [],
    [chat.isGroup, chat.id, chatId, groupMessages, chatMessages]
  ) as Message[];

  // Modify the message loading effect to always load messages when the chat changes
  useEffect(() => {
    // Check if we already have messages
    const hasMessages = messages.length > 0;

    if (!hasMessages) {
      if (!chat.isGroup) {
        dispatch(setLoading(true));
        axios
          .get(`${BASE_URL}/api/messages/${chatId}`)
          .then((response) => {
            dispatch(setMessages({ chatId, messages: response.data }));
          })
          .catch((_error) => {
            console.error("Failed to load messages:", _error);
            toast.error("Failed to load messages");
          })
          .finally(() => {
            dispatch(setLoading(false));
          });
      } else if (chat.id) {
        dispatch(setLoading(true));
        axios
          .get(`${BASE_URL}/api/groups/${chat.id}/messages`)
          .then((response) => {
            dispatch(
              groupActions.setGroupMessages({
                groupId: chat.id,
                messages: response.data,
              })
            );
          })
          .catch((_error) => {
            console.error("Failed to fetch messages:", _error);
            toast.error("Failed to fetch messages");
          })
          .finally(() => {
            dispatch(setLoading(false));
          });
      }
    }
  }, [chatId, chat.isGroup, chat.id, dispatch, messages.length]);

  // Create memoized selectors
  const selectGroupData = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.groups.groups, () => chat.id],
        (groups, chatId) => {
          const rawGroup = groups[chatId];

          if (!chat.isGroup || !rawGroup) return null;

          const result = {
            ...rawGroup,
            currentEvent: rawGroup.currentEvent
              ? {
                  id: rawGroup.currentEvent.id,
                  title: rawGroup.currentEvent.title,
                  date: rawGroup.currentEvent.date,
                  description: rawGroup.currentEvent.description,
                  expenses: rawGroup.currentEvent.expenses || [],
                }
              : null,
          };
          return result;
        }
      ),
    [chat.id, chat.isGroup]
  );

  // Remove fullState selector and just use groupData
  const groupData = useSelector(selectGroupData);

  // Use memoized selectors
  const chatContainer = clsx(
    // Layout
    "flex flex-col flex-1",
    // Appearance
    theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-black",
    // Overflow
    "overflow-hidden"
  );

  const chatHeader = clsx(
    // Layout
    "flex items-center",
    // Spacing
    "p-4",
    // Width
    "w-full",
    // Border
    "border-b",
    //apperance
    theme === "dark" ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-black"
  );

  const messagesContainer = clsx(
    // Layout
    "flex flex-col h-full",
    // Spacing
    "gap-4 p-5",
    // Overflow
    "overflow-y-auto",
    // Scrollbar
    "scrollbar-thin",
    theme === "dark" ? "scrollbar-thumb-gray-600 scrollbar-track-gray-800" : "scrollbar-thumb-gray-200 scrollbar-track-transparent"
  );

  const inputSection = clsx(
    // Layout
    "flex items-center",
    // Spacing
    "px-4 py-2",
    // Border
    "border-t",
    // Appearance
     theme === "dark" ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-black"
  );

  const plusButton = clsx(
    // Layout
    "w-8 h-8",
    "flex items-center justify-center",
    // Appearance
    "rounded-full",
    "bg-gradient-to-tr from-[#57E3DC] to-white",
    // Typography
    "text-black text-xl",
    // Interactive
    "cursor-pointer"
  );

  const input = clsx(
    // Layout
    "flex-1",
    // Spacing
    "px-4 py-2 mx-3",
    // Appearance
    "rounded-full",
    theme === "dark" ? "bg-gray-700 text-white placeholder-gray-400" : "bg-gray-100 text-black placeholder-gray-600",
    // Typography
    "text-black",
    // Focus
    "focus:outline-none focus:ring-2",
    theme === "dark" ? "focus:ring-gray-500" : "focus:ring-gray-300"
  );

  const messageContainer = (isOwnMessage: boolean) =>
    clsx(
      // Layout
      "flex w-full",
      // Alignment
      isOwnMessage ? "flex-row-reverse" : "flex-row"
    );

  const messageContent = (isOwnMessage: boolean) =>
    clsx(
      // Layout
      "flex flex-col",
      // Spacing
      "w-fit ml-1",
      // Alignment
      isOwnMessage ? "items-end" : "items-start"
    );

  const messageStyle = (isOwnMessage: boolean) =>
    clsx(
      "w-fit max-w-full px-3 py-2 rounded-xl break-all transition-colors duration-300",
      isOwnMessage
        ? theme === "dark"
          ? "bg-[#57E3DC] text-white"
          : "bg-light1 text-black"
        : theme === "dark"
        ? "bg-gray-700 text-white"
        : "bg-gray-100 text-black"
    );

  const [showInviteModal, setShowInviteModal] = useState(false);

  const inviteButton = clsx(
    // Position
    "ml-auto",
    // Spacing
    "p-2",
    // Appearance
    "rounded-full",
    // Interactive
    "hover:bg-gray-100",
    // Transitions
    "transition-colors duration-200"
  );

  const [showEventDetails, setShowEventDetails] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState("");

  // Update the edited values when the event changes
  useEffect(() => {
    if (groupData?.currentEvent) {
      setEditedTitle(groupData.currentEvent.title);
      setEditedDate(groupData.currentEvent.date);
    }
  }, [groupData?.currentEvent]);

  // Update the check for current event
  const hasCurrentEvent = !!(
    groupData?.currentEvent?.id && groupData?.currentEvent?.title
  );

  const notifications = useSelector(
    (state: RootState) => state.notifications.notifications
  );

  // Add this effect to mark notifications as read when viewing a group chat
  useEffect(() => {
    if (chat.isGroup) {
      // Find any unread notifications for this group
      const groupNotifications = notifications.filter(
        (n) => n.data?.groupId === chat.id && !n.read
      );

      // Mark them as read
      groupNotifications.forEach((notification) => {
        dispatch(markAsRead(notification.id));
      });
    }
  }, [chat.id, chat.isGroup, dispatch, notifications]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update the socket listener
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();

    // Clean up existing listeners first to prevent duplicates
    socket.off("new-message");
    socket.off("new-group-message");
    socket.off("group-member-joined");
    socket.off("group-updated");
    socket.off("system-message");

    // Set up message handlers
    const handleNewMessage = (data: SocketMessageEvent) => {
      console.log("Received new message:", data);

      // For direct messages, check if this is a message for the current chat
      let isForCurrentChat = false;

      if (chat.isGroup) {
        // For group chats, simple ID comparison
        isForCurrentChat = data.chatId === chat.id;
      } else {
        // For direct messages, check if the message involves the current user
        // The chatId should be in the format user1_user2 (sorted alphabetically)
        if (data.chatId) {
          // Generate the expected friendship ID for the current chat
          const expectedFriendshipId = generateFriendshipId(
            currentUser,
            chat.name
          );

          // Check if the message's chatId matches the expected friendship ID
          isForCurrentChat = data.chatId === expectedFriendshipId;

          // Special case for group invites - they should always be displayed
          if (data.message.type === "group-invite") {
            console.log("Group invite received:", data.message);
            // Check if the current user is involved in this invite
            const users = data.chatId.split("_");
            isForCurrentChat = users.includes(currentUser);
          }
        }
      }

      if (isForCurrentChat) {
        console.log("Message is for current chat:", chat.id);

        // Create a unique key for this message
        const messageKey =
          data.message.id ||
          `${data.chatId}_${data.message.content}_${data.message.timestamp}`;

        console.log(`Processing message: ${messageKey}`);

        // Add to messages if not already there
        if (
          !messages.some(
            (msg) =>
              msg.id === data.message.id ||
              (msg.content === data.message.content &&
                msg.timestamp === data.message.timestamp)
          )
        ) {
          // For direct messages, use the friendship ID (data.chatId)
          // For group messages, use the group ID (chat.id)
          const dispatchChatId = chat.isGroup
            ? chat.id
            : data.chatId || chat.id;
          dispatch(
            addMessage({ chatId: dispatchChatId, message: data.message })
          );
        }
      }
    };

    const handleGroupMessage = (data: SocketMessageEvent) => {
      console.log("Received new group message:", data);
      if (data.groupId === chat.id) {
        // Create a unique key for this message
        const messageKey =
          data.message.id ||
          `${data.groupId}_${data.message.content}_${data.message.timestamp}`;

        console.log(`Processing group message: ${messageKey}`);

        // Add to messages if not already there
        if (
          !messages.some(
            (msg) =>
              msg.id === data.message.id ||
              (msg.content === data.message.content &&
                msg.timestamp === data.message.timestamp)
          )
        ) {
          dispatch(
            groupActions.addGroupMessage({
              groupId: data.groupId,
              message: data.message,
            })
          );
        }
      }
    };

    // Add a specific handler for system messages
    const handleSystemMessage = (data: {
      groupId: string;
      message: Message;
    }) => {
      console.log("System message received:", data);
      if (data.groupId === chat.id.replace("group_", "")) {
        dispatch(
          groupActions.addGroupMessage({
            groupId: data.groupId,
            message: data.message,
          })
        );
      }
    };

    const handleGroupJoin = (data: GroupJoinData) => {
      console.log("User joined group:", data);
      if (data.groupId === chat.id && data.group) {
        // Log the join event
        console.log(`User ${data.username} joined group ${chat.name}`);

        // Update group data if needed
        if (groupData) {
          // Create a new object with the group data and ensure id is set correctly
          const updatedGroup = {
            ...data.group,
            id: chat.id, // This will override any id in data.group
            currentEvent: data.group.currentEvent || groupData.currentEvent,
          };

          dispatch(groupActions.updateGroup(updatedGroup));

          // Send a system message if someone joined
          if (data.username && data.username !== currentUser) {
            const joinContent = `${data.username} joined the group`;

            // Check if we already have a similar message to avoid duplicates
            const checkExisting = (content: string) =>
              messages.some(
                (msg) =>
                  msg.senderId === "system" &&
                  msg.content === content &&
                  new Date(msg.timestamp).getTime() > Date.now() - 5000
              );

            sendMessage(
              {
                chatId: chat.id,
                content: joinContent,
                senderId: "system",
                type: "text",
              },
              {
                dispatch,
                checkExisting,
              }
            );
          }
        }
      }
    };

    const handleGroupUpdate = (data: GroupUpdateData) => {
      console.log("Group updated:", data);
      if (data.groupId === chat.id) {
        // Create update object with only the fields that were updated
        const updateObj: Partial<Group> & { id: string } = { id: chat.id };

        // Handle name updates
        if (data.name) {
          updateObj.name = data.name;
          // Update the edited group title state if we're currently editing
          if (editingGroupTitle) {
            setEditedGroupTitle(data.name);
          }

          // If the name was updated, send a system message
          if (data.name && data.updatedBy && data.updatedBy !== currentUser) {
            const updateContent = `${data.updatedBy} updated the group name to "${data.name}"`;

            // Check if we already have a similar message to avoid duplicates
            const checkExisting = (content: string) =>
              messages.some(
                (msg) =>
                  msg.senderId === "system" &&
                  msg.content === content &&
                  new Date(msg.timestamp).getTime() > Date.now() - 5000
              );

            sendMessage(
              {
                chatId: chat.id,
                content: updateContent,
                senderId: "system",
                type: "text",
              },
              {
                dispatch,
                checkExisting,
              }
            );
          }
        }

        // Handle image updates
        if (data.imageUrl) {
          updateObj.imageUrl = data.imageUrl;

          // If the image was updated, send a system message
          if (
            data.imageUrl &&
            data.updatedBy &&
            data.updatedBy !== currentUser
          ) {
            const updateContent = `${data.updatedBy} updated the group image`;

            // Check if we already have a similar message to avoid duplicates
            const checkExisting = (content: string) =>
              messages.some(
                (msg) =>
                  msg.senderId === "system" &&
                  msg.content === content &&
                  new Date(msg.timestamp).getTime() > Date.now() - 5000
              );

            sendMessage(
              {
                chatId: chat.id,
                content: updateContent,
                senderId: "system",
                type: "text",
              },
              {
                dispatch,
                checkExisting,
              }
            );
          }
        }

        // Preserve current event data
        if (groupData?.currentEvent) {
          updateObj.currentEvent = groupData.currentEvent;
        }

        console.log("Updating group with:", updateObj);

        // Update the group in Redux
        dispatch(groupActions.updateGroup(updateObj));

        // Force refresh of group images if needed
        if (data.imageUrl) {
          forceRefreshGroupImages(chat.id, data.imageUrl);
        }
      }
    };

    // Set up socket listeners
    socket.on("new-message", handleNewMessage);
    socket.on("new-group-message", handleGroupMessage);
    socket.on("group-invite-accepted", handleGroupJoin);
    socket.on("group-member-joined", handleGroupJoin);
    socket.on("group-updated", handleGroupUpdate);
    socket.on("system-message", handleSystemMessage);

    // Clean up on unmount or when dependencies change
    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("new-group-message", handleGroupMessage);
      socket.off("group-invite-accepted", handleGroupJoin);
      socket.off("group-member-joined", handleGroupJoin);
      socket.off("group-updated", handleGroupUpdate);
      socket.off("system-message", handleSystemMessage);
    };
  }, [
    currentUser,
    chat.name,
    chat.id,
    chat.isGroup,
    dispatch,
    groupData?.currentEvent,
    messages,
  ]);

  // Add this effect to automatically close event view when event is cleared
  useEffect(() => {
    if (!groupData?.currentEvent) {
      setShowEventDetails(false);
    }
  }, [groupData?.currentEvent]);

  // Add this to prevent event view from closing when expenses are added
  useEffect(() => {
    const socket = getSocket();

    const handleExpenseAdded = () => {
      // This prevents the event view from closing when an expense is added
      if (showEventDetails) {
        // Keep the event details view open
        setShowEventDetails(true);
      }
    };

    socket.on("expense-added", handleExpenseAdded);

    return () => {
      socket.off("expense-added", handleExpenseAdded);
    };
  }, [showEventDetails]);

  // Modify the existing effect that closes the event view
  useEffect(() => {
    if (!groupData?.currentEvent && showEventDetails) {
      setShowEventDetails(false);
    }
  }, [groupData?.currentEvent, showEventDetails]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const messageContent = inputText.trim();
      setInputText("");

      if (chat.isGroup) {
        // For group messages, ensure the chatId is properly formatted
        // If the chat.id already starts with 'group_', use it as is
        // Otherwise, add the 'group_' prefix
        const groupChatId = chat.id.startsWith("group_")
          ? chat.id
          : `group_${chat.id}`;

        await sendMessage(
          {
            chatId: groupChatId,
            content: messageContent,
            senderId: currentUser,
            type: "text",
          },
          {
            dispatch,
          }
        );
      } else {
        // For direct messages, ensure we're using the correct friendship ID
        // The chat.id might already be the correct friendship ID, but let's make sure
        const recipient = chat.name; // For direct messages, the chat name is the other user's username
        const friendshipId = generateFriendshipId(currentUser, recipient);

        await sendMessage({
          chatId: friendshipId,
          content: messageContent,
          senderId: currentUser,
          type: "text",
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Update the event cancellation handler
  const handleCancelEvent = () => {
    dispatch(
      groupActions.setGroupEvent({
        groupId: chat.id,
        event: null,
      })
    );

    // Send explicit null to server
    updateEvent(chat.id, null);

    // Force immediate UI update
    setShowEventDetails(false);

    // Clear any residual event data
    dispatch(
      groupActions.setGroupEvent({
        groupId: chat.id,
        event: {
          id: "",
          title: "",
          date: "",
          description: "",
          expenses: [],
        },
      })
    );

    const cancelContent = `${currentUser} cancelled the event`;

    // Check if we already have a similar message to avoid duplicates
    const checkExisting = (content: string) =>
      messages.some(
        (msg) =>
          msg.senderId === "system" &&
          msg.content === content &&
          new Date(msg.timestamp).getTime() > Date.now() - 5000
      );

    sendMessage(
      {
        chatId: chat.id,
        content: cancelContent,
        senderId: "system",
        type: "text",
      },
      {
        dispatch,
        checkExisting,
      }
    );

    // Add a toast notification for event cancellation
    toast.success("Event cancelled successfully");
  };

  useEffect(() => {
    // If this is an expense notification, show the event details
    if (chat.notificationType === "expense_added" && groupData?.currentEvent) {
      setShowEventDetails(true);
    }
  }, [chat.id, chat.notificationType, groupData]);

  useEffect(() => {
    if (chat.id && chat.isGroup) {
      // Log when a user joins a group chat room
      console.log(
        `👥 User ${currentUser} viewing group: ${chat.name} (${chat.id})`
      );

      sendSocketEvent({
        type: "join-group",
        payload: {
          groupId: chat.id,
          username: currentUser,
        },
      });

      return () => {
        // Log when a user leaves a group chat room
        console.log(
          `👋 User ${currentUser} left group: ${chat.name} (${chat.id})`
        );

        sendSocketEvent({
          type: "leave-group",
          payload: {
            groupId: chat.id,
            username: currentUser,
          },
        });
      };
    }
  }, [chat.id, chat.isGroup, currentUser, chat.name]);

  // Add these state variables after the other state variables
  const [editingGroupTitle, setEditingGroupTitle] = useState(false);
  const [editedGroupTitle, setEditedGroupTitle] = useState(chat.name);

  // Add this selector to get the latest group data
  const latestGroupData = useSelector((state: RootState) =>
    chat.isGroup ? state.groups.groups[chat.id] : null
  );

  // Use the latest group name if available
  const groupName = latestGroupData?.name || chat.name;

  // Update the useEffect to use the latest group name
  useEffect(() => {
    setEditedGroupTitle(groupName);
  }, [groupName]);

  // Update the useEffect to format the date correctly
  useEffect(() => {
    if (groupData?.currentEvent?.date) {
      setEditedDate(formatDateForInput(groupData.currentEvent.date));
    }
  }, [groupData?.currentEvent?.date]);

  return (
    <div className="flex w-full h-full">
      {showEventDetails && groupData?.currentEvent ? (
        <div className={chatContainer}>
          <div className={chatHeader}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEventDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-6 h-6 text-black" />
              </button>
              <div className="flex flex-col">
                {editingTitle ? (
                  <ClickInput
                    value={editedTitle}
                    onChange={setEditedTitle}
                    onSave={() => {
                      if (editedTitle.trim() && groupData?.currentEvent) {
                        const updatedEvent = {
                          ...groupData.currentEvent,
                          title: editedTitle.trim(),
                        };
                        updateEvent(chat.id, updatedEvent);
                        dispatch(
                          groupActions.setGroupEvent({
                            groupId: chat.id,
                            event: updatedEvent,
                          })
                        );
                      }
                      setEditingTitle(false);
                    }}
                    onCancel={() => {
                      if (groupData?.currentEvent) {
                        setEditedTitle(groupData.currentEvent.title);
                      }
                      setEditingTitle(false);
                    }}
                    className="text-black text-2xl font-bold"
                    minWidth={150}
                    charWidth={16}
                  />
                ) : (
                  <span
                    className="text-black text-2xl font-bold cursor-pointer hover:underline"
                    onClick={() => {
                      if (groupData?.currentEvent) {
                        setEditedTitle(groupData.currentEvent.title);
                        setEditingTitle(true);
                      }
                    }}
                  >
                    {groupData?.currentEvent?.title}
                  </span>
                )}

                {editingDate ? (
                  <div className="flex items-center">
                    <input
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      onBlur={() => {
                        if (editedDate && groupData?.currentEvent) {
                          // Create a new date object from the input value
                          // The input value is already in YYYY-MM-DD format
                          const updatedEvent = {
                            ...groupData.currentEvent,
                            date: editedDate, // Keep the date as is from the input
                          };
                          updateEvent(chat.id, updatedEvent);
                          dispatch(
                            groupActions.setGroupEvent({
                              groupId: chat.id,
                              event: updatedEvent,
                            })
                          );
                        }
                        setEditingDate(false);
                      }}
                      className="text-gray-500 text-sm border-b border-gray-300 focus:outline-none focus:border-dark1"
                      autoFocus
                    />
                  </div>
                ) : (
                  <span
                    className="text-gray-500 text-sm cursor-pointer hover:underline flex items-center"
                    onClick={() => {
                      if (groupData?.currentEvent) {
                        // If the date is already in YYYY-MM-DD format, use it directly
                        // Otherwise, format it using our helper function
                        const date = groupData.currentEvent.date;
                        setEditedDate(
                          /^\d{4}-\d{2}-\d{2}$/.test(date)
                            ? date
                            : formatDateForInput(date)
                        );
                        setEditingDate(true);
                      }
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    {groupData?.currentEvent?.date
                      ? formatDateForDisplay(groupData.currentEvent.date)
                      : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <EventDetailsView
              description={groupData.currentEvent.description}
              expenses={groupData.currentEvent.expenses}
              participants={groupData.users}
              onCancel={handleCancelEvent}
              groupId={chat.id}
            />
          </div>
        </div>
      ) : (
        <div className={chatContainer}>
          <div className={chatHeader}>
            <div className="flex items-center gap-4 mr-auto">
              {chat.isGroup ? (
                <EditableGroupImage groupId={chat.id} size={74} />
              ) : (
                <ProfileFrame username={groupName} size={74} />
              )}
              {chat.isGroup ? (
                editingGroupTitle ? (
                  <ClickInput
                    value={editedGroupTitle}
                    onChange={setEditedGroupTitle}
                    onSave={async () => {
                      if (
                        editedGroupTitle.trim() &&
                        editedGroupTitle !== groupName
                      ) {
                        try {
                          // Any group member can update the group name
                          await updateGroupName(
                            chat.id,
                            editedGroupTitle.trim(),
                            currentUser
                          );
                          toast.success("Group name updated successfully");
                        } catch (error) {
                          toast.error("Failed to update group name");
                          console.error(error);
                        }
                      }
                      setEditingGroupTitle(false);
                    }}
                    onCancel={() => {
                      setEditedGroupTitle(groupName);
                      setEditingGroupTitle(false);
                    }}
                    className="text-black text-2xl font-bold"
                    minWidth={150}
                    charWidth={16}
                  />
                ) : (
                  <span
                    className="text-black text-2xl font-bold cursor-pointer hover:underline"
                    onClick={() => {
                      setEditedGroupTitle(groupName);
                      setEditingGroupTitle(true);
                    }}
                  >
                    {groupName}
                  </span>
                )
              ) : (
                <span className="text-black text-2xl font-bold">
                  {chat.name}
                </span>
              )}
            </div>

            {chat.isGroup && (
              <div className="flex items-center gap-4">
                {hasCurrentEvent ? (
                  <button
                    onClick={() => setShowEventDetails(true)}
                    className="px-4 py-2 bg-[#57E3DC] rounded-lg text-white"
                  >
                    {groupData?.currentEvent?.title}
                  </button>
                ) : (
                  <AddEventButton
                    onConfirm={(
                      eventName: string,
                      eventDate: string,
                      description: string
                    ) => {
                      const newEvent = {
                        id: Date.now().toString(),
                        title: eventName,
                        date: eventDate,
                        description,
                        expenses: [],
                      };
                      updateEvent(chat.id, newEvent);
                      dispatch(
                        groupActions.setGroupEvent({
                          groupId: chat.id,
                          event: newEvent,
                        })
                      );

                      // Add a toast notification for event creation
                      toast.success(
                        `Event "${eventName}" created successfully`
                      );
                    }}
                  />
                )}
                <button
                  className={inviteButton}
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-6 h-6 text-[#57E3DC]" />
                </button>
              </div>
            )}
          </div>

          <div className={messagesContainer}>
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === currentUser;

              // For displaying sender name (which is no longer in the Message type)
              const senderName = isOwnMessage ? "You" : message.senderId;

              // Check if this is a group invite message
              if (message.type === "group-invite") {
                // Extract the group name from the message content
                // The format is: "{senderId} invited you to join {groupName}"
                const groupNameMatch = message.content.match(
                  /invited you to join (.+)$/
                );
                const extractedGroupName = groupNameMatch
                  ? groupNameMatch[1]
                  : (message as any).groupName || "Unknown Group";

                console.log("Rendering group invite:", message);

                // Extract groupId from the message id which has format: invite_{groupId}_{timestamp}
                let extractedGroupId = "";
                if (message.id && message.id.startsWith("invite_")) {
                  const parts = message.id.split("_");
                  if (parts.length >= 2) {
                    extractedGroupId = parts[1];
                  }
                }

                // Use the extracted groupId or fall back to any existing groupId property
                const groupId =
                  extractedGroupId || (message as any).groupId || "";

                return (
                  <div key={message.id || index} className="w-full my-2">
                    <GroupInvite
                      id={message.id}
                      groupId={groupId}
                      groupName={extractedGroupName}
                      invitedBy={message.senderId}
                    />
                  </div>
                );
              }

              // Handle system messages with plain italic text
              if (message.senderId === "system") {
                return (
                  <div
                    key={message.id || index}
                    className="w-full flex justify-center"
                  >
                    <span className="text-gray-500 text-sm italic px-4 py-1">
                      {message.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={message.id || index}
                  className={messageContainer(isOwnMessage)}
                >
                  {!isOwnMessage && (
                    <ProfileFrame username={message.senderId} size={40} />
                  )}
                  <div className={messageContent(isOwnMessage)}>
                    {!isOwnMessage && (
                      <span className="text-gray-500 text-sm ml-2 mb-1">
                        {senderName}
                      </span>
                    )}
                    <div className={messageStyle(isOwnMessage)}>
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className={inputSection}>
            <button className={plusButton}>+</button>
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className={input}
            />
          </div>
        </div>
      )}
      {chat.isGroup && groupData && (
        <GroupMembers
          members={groupData.users || []}
          adminUsername={groupData.admin || ""}
        />
      )}
      {chat.isGroup && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          groupId={chat.id}
          groupName={chat.name}
          onInvite={async (usernames) => {
            try {
              // Send invites one by one with invitedBy field
              for (const username of usernames) {
                await axios.post(`${BASE_URL}/api/groups/invite`, {
                  groupId: chat.id,
                  username,
                  invitedBy: currentUser, // Add the invitedBy field
                });
              }

              toast.success(
                `Invites sent to ${usernames.length} friend${
                  usernames.length !== 1 ? "s" : ""
                }`
              );
            } catch (error) {
              // Type guard for AxiosError
              if (axios.isAxiosError(error)) {
                if (error.response) {
                  console.error("Invite error response:", error.response.data);
                }
                console.error("Failed to send invites:", error);
              }
              toast.error("Failed to send invites");
            }
          }}
        />
      )}
    </div>
  );
};

export default React.memo(ChatView);
