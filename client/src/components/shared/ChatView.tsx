import React, { useState, useRef, useEffect, useMemo } from "react";
import clsx from "clsx";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { toast } from "react-hot-toast";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import Button from "./Button";
import { useNavigate } from "react-router-dom";
import {
  sendMessage,
  getSocket,
  updateEvent,
  sendSocketEvent,
  updateGroupName,
  generateFriendshipId,
  loadReadReceipts,
  markMessagesAsRead,
} from "../../services/socketService";
import {
  addMessage,
  setMessages,
  setLoading,
  updateMessageReadStatus,
} from "../../store/slice/chatSlice";
import { SocketMessageEvent, Message } from "../../types/messageTypes";
import ProfileFrame from "./ProfileFrame";
import EditableGroupImage from "./EditableGroupImage";
import { UserPlus, ArrowLeft, Calendar, LogOut } from "lucide-react";
import GroupMembers from "../groupchats/GroupMembers";
import InviteModal from "../modals/GroupInviteModal";
import { createSelector } from "@reduxjs/toolkit";
import * as groupActions from "../../store/slice/groupSlice";
import GroupInvite from "../groupchats/GroupInvite";
import AddEventButton from "../groupchats/events/AddEventButton";
import EventDetailsView from "../groupchats/events/EventDetailsView";
import { markAsRead } from "../../store/slice/notificationsSlice";
import ClickInput from "./ClickInput";
import { useTheme } from "../../context/ThemeContext";
import { uploadFile } from "../../services/imageUploadService";
import ImageUploader from "./ImageUploader";
import LeaveGroupModal from "../modals/LeaveGroupModal";
import CancelEventModal from "../modals/CancelEventModal";

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

// // Add interface for group data
// interface GroupJoinData {
//   groupId: string;
//   username?: string; // Add username property
//   group: {
//     id: string;
//     name: string;
//     users: Array<{
//       username: string;
//       profilePicture: string | null;
//       isAdmin: boolean;
//       venmoUsername?: string;
//     }>;
//     currentEvent?: Event;
//     // add other group properties you need
//   };
// }

// // Add this interface near the top of the file with other interfaces
// interface GroupUpdateData {
//   groupId: string;
//   name?: string;
//   imageUrl?: string;
//   updatedBy?: string;
//   members?: string[];
// }

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

// Update the MessageStatus component
const MessageStatus: React.FC<{
  message: Message;
  index: number;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  messages: Message[];
}> = ({ message, index, isSelected, onSelect, messages }) => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const isOwnMessage = message.senderId === currentUser;

  // Get all readers excluding current user
  const { readers } = useMemo(() => {
    const readByArray = message.readBy || [];
    return {
      readers: Array.from(new Set(readByArray)).filter(
        (reader) => reader !== currentUser
      ),
    };
  }, [message.readBy, currentUser]);

  // Check if this is the last message read by each reader
  const isLastReadMessage = useMemo(() => {
    if (!readers.length) return false;

    return readers.some((reader) => {
      // Look at all messages after this one
      for (let i = index + 1; i < messages.length; i++) {
        // If we find a later message read by this user, this isn't their last read message
        if (messages[i].readBy?.includes(reader)) {
          return false;
        }
      }
      // If we didn't find any later messages read by this user, this is their last read message
      return true;
    });
  }, [readers, index, messages]);

  // Only show status if:
  // 1. This is the last message in the chat
  // 2. This is the last read message for some user
  // 3. The message is selected
  const isLastMessageInChat = index === messages.length - 1;
  if (!isLastMessageInChat && !isLastReadMessage && !isSelected) return null;

  // Get all readers who have this as their last read message
  const lastReadByReaders = readers.filter((reader) => {
    for (let i = index + 1; i < messages.length; i++) {
      if (messages[i].readBy?.includes(reader)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div
      className="flex items-center justify-end gap-1 mt-1 cursor-pointer"
      onClick={onSelect}
    >
      {isSelected ? (
        // Show detailed view when selected
        <div className="text-gray-400 text-xs text-right">
          <div className="mb-1">
            {new Date(message.timestamp).toLocaleString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
          {readers.length > 0 && <div>Seen by {readers.join(", ")}</div>}
        </div>
      ) : (
        // Show compact view for last message or last read message
        <div className="flex items-center justify-end">
          {lastReadByReaders.length > 0 ? (
            <div className="flex flex-row-reverse items-center">
              {lastReadByReaders.map((reader, idx) => (
                <div
                  key={reader}
                  className="relative hover:z-10"
                  style={{
                    marginRight:
                      idx !== lastReadByReaders.length - 1 ? "-6px" : "0",
                    transform: `translateX(${idx * 2}px)`,
                    zIndex: idx,
                  }}
                >
                  <div className="p-0.5 bg-white rounded-full">
                    <ProfileFrame
                      username={reader}
                      size={14}
                      className="rounded-full ring-2 ring-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            isOwnMessage && <div className="text-gray-400 text-xs">Sent</div>
          )}
        </div>
      )}
    </div>
  );
};

// Update the shouldShowDivider function to handle undefined timestamps
const shouldShowDivider = (
  currentMsg: Message,
  prevMsg: Message | null
): boolean => {
  if (!prevMsg) return true;

  // Ensure we have valid timestamps
  const currentDate = currentMsg.timestamp
    ? new Date(currentMsg.timestamp)
    : new Date();
  const prevDate = prevMsg.timestamp ? new Date(prevMsg.timestamp) : new Date();

  // Show divider if:
  // 1. Different days
  // 2. More than 15 minutes gap
  // 3. If either message doesn't have a timestamp (safety check)
  return (
    !currentMsg.timestamp ||
    !prevMsg.timestamp ||
    currentDate.toDateString() !== prevDate.toDateString() ||
    currentDate.getTime() - prevDate.getTime() > 15 * 60 * 1000
  );
};

// Update the TimestampDivider to handle undefined timestamps
const TimestampDivider: React.FC<{ timestamp?: string }> = ({ timestamp }) => {
  const formattedTime = timestamp
    ? formatMessageTimestamp(timestamp)
    : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 dark:bg-gray-700 h-[1px] flex-grow"></div>
      <span className="mx-4 text-gray-500 dark:text-gray-400 text-xs font-medium">
        {formattedTime}
      </span>
      <div className="bg-gray-200 dark:bg-gray-700 h-[1px] flex-grow"></div>
    </div>
  );
};

// Update the formatMessageTimestamp function to handle undefined timestamps
const formatMessageTimestamp = (timestamp?: string): string => {
  const date = timestamp ? new Date(timestamp) : new Date();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // If same day, show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // If yesterday, show "Yesterday"
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // If within a week, show day name
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  // If this year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "long", day: "numeric" });
  }

  // Otherwise show full date
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const [img, setImg] = useState<{ file: File | null; url: string }>({
    file: null,
    url: "",
  });
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

  // Update the message loading effect
  useEffect(() => {
    // Skip if we don't have a valid chat ID
    if (!chat.id) return;

    // Check if we already have messages
    const hasMessages = messages.length > 0;
    const isGroupChat = chat.isGroup;
    const messageId = isGroupChat ? chat.id : chatId;

    if (!hasMessages) {
      dispatch(setLoading(true));

      // Choose the correct endpoint based on chat type
      const endpoint = isGroupChat
        ? `${BASE_URL}/api/groups/${chat.id}/messages`
        : `${BASE_URL}/api/messages/${chatId}`;

      axios
        .get(endpoint)
        .then((response) => {
          if (isGroupChat) {
            dispatch(
              groupActions.setGroupMessages({
                groupId: chat.id,
                messages: response.data,
              })
            );
          } else {
            dispatch(
              setMessages({
                chatId: messageId,
                messages: response.data,
              })
            );
          }
        })
        .catch((error) => {
          console.error("Failed to load messages:", error);
          toast.error("Failed to load messages");
        })
        .finally(() => {
          dispatch(setLoading(false));
        });
    }
  }, [chat.id, chat.isGroup, chatId, dispatch, messages.length]);

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
    theme === "dark"
      ? "border-gray-700 bg-gray-800 text-white"
      : "border-gray-300 bg-white text-black"
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
    theme === "dark"
      ? "scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      : "scrollbar-thumb-gray-200 scrollbar-track-transparent"
  );

  const inputSection = clsx(
    // Layout
    "flex items-center",
    // Spacing
    "px-4 py-2",
    // Border
    "border-t",
    // Appearance
    theme === "dark"
      ? "border-gray-700 bg-gray-800 text-white"
      : "border-gray-300 bg-white text-black"
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
    theme === "dark"
      ? "bg-gray-700 text-white placeholder-gray-400"
      : "bg-gray-100 text-black placeholder-gray-600",
    // Typography
    "text-black",
    // Focus
    "focus:outline-none focus:ring-2",
    theme === "dark" ? "focus:ring-gray-500" : "focus:ring-gray-300"
  );

  const messageContainer = (isOwnMessage: boolean) =>
    clsx(
      // Layout
      "flex w-full relative",
      // Alignment
      isOwnMessage ? "flex-row-reverse" : "flex-row",
      // Spacing
      "mb-0.5" // Small margin between messages
    );

  const messageContent = (isOwnMessage: boolean) =>
    clsx(
      // Layout
      "flex flex-col",
      // Spacing
      "w-fit ml-1",
      // Width constraint
      "max-w-[70%]",
      // Alignment
      isOwnMessage ? "items-end" : "items-start",
      // Add space for read receipts
      "pb-4" // Add padding at bottom for read receipts
    );

  const messageStyle = (isOwnMessage: boolean) =>
    clsx(
      // Layout and width
      "w-fit max-w-full px-3 py-2",
      // Text handling
      "whitespace-pre-wrap break-words",
      // Appearance
      "rounded-xl",
      // Dark/Light mode text color
      theme === "dark" ? "text-white" : "text-black",
      // Alignment and color
      isOwnMessage
        ? theme === "dark"
          ? "bg-gray-800 ml-auto" // Dark mode own messages
          : "bg-light1 ml-auto" // Light mode own messages
        : theme === "dark"
        ? "bg-gray-700" // Dark mode others' messages
        : "bg-gray-200" // Light mode others' messages
    );

  const [showInviteModal, setShowInviteModal] = useState(false);
  // Add state for leave confirmation modal
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [showCancelEventConfirmation, setShowCancelEventConfirmation] =
    useState(false);

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

  // Update the socket effect to handle both active and background messages
  useEffect(() => {
    const socket = getSocket();

    // Set up message handlers
    const handleNewMessage = (data: SocketMessageEvent) => {
      console.log("📨 Received new message:", data);

      // For direct messages, check if this is a message for the current chat
      let isForCurrentChat = false;

      if (chat.isGroup) {
        const currentGroupId = chat.id;
        const messageGroupId =
          data.groupId?.replace("group_", "") ||
          data.chatId?.replace("group_", "");
        isForCurrentChat = currentGroupId === messageGroupId;
        console.log("Group message check:", {
          currentGroupId,
          messageGroupId,
          isMatch: isForCurrentChat,
        });
      } else {
        const expectedFriendshipId = generateFriendshipId(
          currentUser,
          chat.name
        );
        isForCurrentChat = data.chatId === expectedFriendshipId;
      }

      if (isForCurrentChat) {
        console.log("✅ Message is for current chat:", chat.id);

        // Add to messages if not already there
        if (!messages.some((msg) => msg.id === data.message.id)) {
          if (chat.isGroup) {
            dispatch(
              groupActions.addGroupMessage({
                groupId: chat.id,
                message: {
                  ...data.message,
                  readBy: data.message.readBy || [data.message.senderId],
                },
              })
            );

            // Mark message as read since we're viewing it
            socket.emit("mark-messages-read", {
              chatId: `group_${chat.id}`,
              userId: currentUser,
            });
          } else {
            dispatch(
              addMessage({
                chatId: data.chatId!,
                message: {
                  ...data.message,
                  readBy: data.message.readBy || [data.message.senderId],
                },
              })
            );
          }
        }
      } else {
        // Handle messages for other chats
        if (chat.isGroup && data.groupId) {
          // Store group message even if not viewing
          dispatch(
            groupActions.addGroupMessage({
              groupId: data.groupId.replace("group_", ""),
              message: {
                ...data.message,
                readBy: data.message.readBy || [data.message.senderId],
              },
            })
          );
        } else if (data.chatId) {
          // Store direct message even if not viewing
          dispatch(
            addMessage({
              chatId: data.chatId,
              message: {
                ...data.message,
                readBy: data.message.readBy || [data.message.senderId],
              },
            })
          );
        }
      }
    };

    // Set up socket listeners
    socket.on("new-message", handleNewMessage);
    socket.on("new-group-message", handleNewMessage);

    // Add handler for read receipts
    const handleMessageRead = (data: {
      chatId: string;
      messageId: string;
      readBy: string[];
    }) => {
      console.log("👀 Message read event received:", data);

      const isGroupMessage = data.chatId.startsWith("group_");
      const normalizedChatId = isGroupMessage
        ? data.chatId.replace("group_", "")
        : data.chatId;
      const currentNormalizedChatId = chat.isGroup ? chat.id : chatId;

      console.log("Comparing IDs:", {
        normalizedChatId,
        currentNormalizedChatId,
      });

      if (normalizedChatId === currentNormalizedChatId) {
        console.log("✅ Updating read status for message:", data.messageId);

        if (chat.isGroup) {
          dispatch(
            groupActions.updateMessageReadStatus({
              groupId: chat.id,
              messageId: data.messageId,
              readBy: data.readBy,
            } as any)
          );
        } else {
          dispatch(
            updateMessageReadStatus({
              chatId: data.chatId,
              messageId: data.messageId,
              readBy: data.readBy,
            } as any)
          );
        }
      }
    };

    socket.on("message-read", handleMessageRead);

    // Clean up
    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("new-group-message", handleNewMessage);
      socket.off("message-read", handleMessageRead);
    };
  }, [
    chat.id,
    chat.isGroup,
    chat.name,
    currentUser,
    chatId,
    messages,
    dispatch,
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

  // Add this effect to automatically mark messages as read
  useEffect(() => {
    if (!messages.length || !currentUser || !chatId) return;

    const socket = getSocket();

    // Emit mark-messages-read event
    socket.emit("mark-messages-read", {
      chatId,
      userId: currentUser,
    });

    // The API call is now handled in socketService.ts
  }, [messages, currentUser, chatId]);

  // Add this effect to handle real-time group messages
  useEffect(() => {
    if (!chat.isGroup || !chat.id) return;

    const socket = getSocket();

    // Listen for new group messages
    socket.on(`group_message_${chat.id}`, (data: SocketMessageEvent) => {
      dispatch(
        groupActions.addGroupMessage({
          groupId: chat.id,
          message: data.message,
        })
      );
    });

    // Listen for group message updates (read receipts, etc.)
    socket.on(
      `group_message_update_${chat.id}`,
      (data: { messageId: string; readBy: string[]; groupId: string }) => {
        dispatch(
          groupActions.updateMessageReadStatus({
            groupId: chat.id,
            messageId: data.messageId,
            readBy: data.readBy,
          } as any)
        );
      }
    );

    // Join the group's room
    socket.emit("join_group", chat.id);

    return () => {
      socket.off(`group_message_${chat.id}`);
      socket.off(`group_message_update_${chat.id}`);
      socket.emit("leave_group", chat.id);
    };
  }, [chat.id, chat.isGroup, dispatch]);

  // Update the message sending for groups
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
  // Update the image messages
  const handleSendImage = async () => {
    if (!img.file) return;
    const imgURL = await uploadFile(img.file);
    setImg({
      file: null,
      url: "",
    });
    //const messageContent = await uploadFile(img.file)
    try {
      console.log("Handling message");

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
            content: imgURL,
            senderId: currentUser,
            type: "image",
            attachments: { url: imgURL, type: "image" },
          },
          {
            dispatch,
          }
        );
        console.log("image sent");
      }
      // For direct messages, ensure we're using the correct friendship ID
      // The chat.id might already be the correct friendship ID, but let's make sure
      const recipient = chat.name; // For direct messages, the chat name is the other user's username
      const friendshipId = generateFriendshipId(currentUser, recipient);
      await sendMessage({
        chatId: friendshipId,
        content: imgURL,
        senderId: currentUser,
        type: "image",
        attachments: { url: imgURL, type: "image" },
      });
      console.log("image sent");
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
  // Allows for users to upload images
  const handleImg = (file: File) => {
    setImg({
      file: file,
      url: URL.createObjectURL(file),
    });
    console.log(img);
    handleSendImage();
  };
  useEffect(() => {
    console.log("Updated image state:", img);
  }, [img]);

  // Update the event cancellation handler to show the confirmation modal
  const handleCancelEvent = () => {
    setShowCancelEventConfirmation(true);
  };

  // Add a new function to handle the actual cancellation when confirmed
  const confirmCancelEvent = () => {
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

    // Close the confirmation modal
    setShowCancelEventConfirmation(false);

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

  // Add these state variables at the top of your component
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  // // Add this helper function to get reader details
  // const getReadDetails = (message: Message) => {
  //   if (!message.readBy) return { readers: [], status: "Sent" };

  //   const readByOthers = message.readBy.filter(id => id !== currentUser);

  //   if (readByOthers.length === 0) return { readers: [], status: "Sent" };

  //   return {
  //     readers: readByOthers,
  //     status: "Seen"
  //   };
  // };

  // // Update the isLastMessageFromSender function
  // const isLastMessageFromSender = (messages: Message[], index: number) => {
  //   const currentMessage = messages[index];

  //   // Look at subsequent messages to find the next one from the same sender
  //   for (let i = index + 1; i < messages.length; i++) {
  //     if (messages[i].senderId === currentMessage.senderId) {
  //       return false;
  //     }
  //   }
  //   return true;
  // };

  // Update the renderMessages function
  const renderMessages = (messages: Message[]) => {
    return messages.map((message, index) => {
      // Always show timestamp for first message or when needed
      const showTimestamp =
        index === 0 ||
        shouldShowDivider(message, index > 0 ? messages[index - 1] : null);

      // Handle system messages with plain italic text
      if (message.senderId === "system") {
        return (
          <React.Fragment key={message.id || index}>
            {showTimestamp && (
              <TimestampDivider timestamp={message.timestamp} />
            )}
            <div className="w-full flex justify-center">
              <span className="text-gray-500 text-sm italic px-4 py-1">
                {message.content}
              </span>
            </div>
          </React.Fragment>
        );
      }

      // Handle group invites
      if (
        message.type === "group-invite" &&
        message.groupId &&
        message.groupName
      ) {
        const isOwnMessage = message.senderId === currentUser;
        const isSender = message.invitedBy === currentUser;

        return (
          <React.Fragment key={message.id || index}>
            {showTimestamp && (
              <TimestampDivider timestamp={message.timestamp} />
            )}
            <div className={messageContainer(isOwnMessage)}>
              {!isOwnMessage && (
                <div className="flex-shrink-0 mr-2 w-8">
                  <ProfileFrame
                    username={message.senderId}
                    size={32}
                    className="rounded-full"
                  />
                </div>
              )}
              <div className={messageContent(isOwnMessage)}>
                {!isOwnMessage && (
                  <span className="text-gray-500 text-sm mb-1">
                    {message.senderId}
                  </span>
                )}
                <div className="mb-2">
                  {isSender ? (
                    <div
                      className={clsx(
                        "flex flex-col p-3 w-fit rounded-xl",
                        theme === "dark"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-200 text-black"
                      )}
                    >
                      <span
                        className={clsx(
                          "text-sm font-semibold",
                          theme === "dark" ? "text-white" : "text-black"
                        )}
                      >
                        Group Invite
                      </span>
                      <p
                        className={clsx(
                          "text-sm",
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        )}
                      >
                        {message.groupName} - Invite sent
                      </p>
                    </div>
                  ) : (
                    <GroupInvite
                      id={message.id}
                      groupId={message.groupId}
                      groupName={message.groupName}
                      invitedBy={message.invitedBy || message.senderId}
                      onAccept={() => {
                        // After successful acceptance, update the message status
                        const updatedMessage = {
                          ...message,
                          status: "accepted",
                        };
                        if (chat.isGroup) {
                          dispatch(
                            groupActions.addGroupMessage({
                              groupId: chat.id,
                              message: updatedMessage,
                            })
                          );
                        }
                      }}
                    />
                  )}
                </div>
                <MessageStatus
                  message={message}
                  index={index}
                  isSelected={selectedMessageId === message.id}
                  messages={messages}
                  onSelect={(e) => {
                    e.stopPropagation();
                    setSelectedMessageId(
                      selectedMessageId === message.id ? null : message.id
                    );
                  }}
                />
              </div>
            </div>
          </React.Fragment>
        );
      }

      const isOwnMessage = message.senderId === currentUser;
      const senderName = isOwnMessage ? "You" : message.senderId;

      // Check if the previous message was from the same sender
      const isFirstInSequence =
        index === 0 || messages[index - 1].senderId !== message.senderId;

      // Check if this is the last message in a sequence
      const isLastInSequence =
        index === messages.length - 1 ||
        messages[index + 1].senderId !== message.senderId;

      return (
        <React.Fragment key={message.id || index}>
          {showTimestamp && <TimestampDivider timestamp={message.timestamp} />}
          <div
            className={clsx(
              messageContainer(isOwnMessage),
              // Make consecutive messages even closer together
              !isFirstInSequence && "-mt-6",
              isLastInSequence && "mb-1" // Keep small margin after sequence ends
            )}
          >
            {/* Show profile picture only if it's the first message in a sequence */}
            {isFirstInSequence && !isOwnMessage && (
              <div className="flex-shrink-0 mr-2 w-8">
                {" "}
                {/* Fixed width for alignment */}
                <ProfileFrame
                  username={message.senderId}
                  size={32}
                  className="rounded-full"
                />
              </div>
            )}
            {/* Add placeholder space when no profile picture */}
            {!isFirstInSequence && !isOwnMessage && (
              <div className="w-8 mr-2" />
            )}
            <div className={messageContent(isOwnMessage)}>
              {/* Show username only if it's the first message in a sequence */}
              {isFirstInSequence && !isOwnMessage && (
                <span className="text-gray-500 text-sm mb-1">{senderName}</span>
              )}
              <div
                className={clsx(
                  messageStyle(isOwnMessage),
                  isFirstInSequence && "rounded-t-xl",
                  isLastInSequence && "rounded-b-xl",
                  isFirstInSequence && isLastInSequence && "rounded-xl"
                )}
                onClick={() =>
                  setSelectedMessageId(
                    selectedMessageId === message.id ? null : message.id
                  )
                }
              >
                {message.attachments ? (
                  <img
                    src={message.attachments.url}
                    alt="Image"
                    className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90"
                  />
                ) : (
                  message.content
                )}
              </div>
              <MessageStatus
                message={message}
                index={index}
                isSelected={selectedMessageId === message.id}
                messages={messages}
                onSelect={(e) => {
                  e.stopPropagation();
                  setSelectedMessageId(
                    selectedMessageId === message.id ? null : message.id
                  );
                }}
              />
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  // Add this effect to load read receipts
  useEffect(() => {
    if (chat.isGroup && chat.id) {
      const storedReceipts = loadReadReceipts(chat.id);

      // Update read receipts in Redux store
      Object.entries(storedReceipts).forEach(([messageId, readBy]) => {
        dispatch(
          groupActions.updateMessageReadStatus({
            groupId: chat.id,
            messageId,
            readBy: readBy as string[],
          } as any)
        );
      });
    }
  }, [chat.isGroup, chat.id, dispatch]);

  // Add this effect to mark messages as read when they're viewed
  useEffect(() => {
    if (messages.length > 0) {
      // Mark messages as read
      markMessagesAsRead(
        chat.isGroup ? `group_${chat.id}` : chatId,
        currentUser,
        messages
      );
    }
  }, [messages, chat.id, chat.isGroup, chatId, currentUser]);

  // Add this effect to load group messages
  useEffect(() => {
    const loadGroupMessages = async () => {
      if (!chat.isGroup || !chat.id) return;

      try {
        dispatch(setLoading(true));
        const response = await axios.get(
          `${BASE_URL}/api/groups/${chat.id}/messages`
        );

        if (response.data) {
          dispatch(
            groupActions.setGroupMessages({
              groupId: chat.id,
              messages: response.data,
            })
          );
        }
      } catch (error) {
        console.error("Error loading group messages:", error);
        toast.error("Failed to load messages");
      } finally {
        dispatch(setLoading(false));
      }
    };

    if (chat.isGroup) {
      loadGroupMessages();
    }
  }, [chat.id, chat.isGroup, dispatch]);

  // Update the leave group handler to handle the actual leaving
  const handleLeaveGroup = async () => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/groups/leave`, {
        data: {
          groupId: chat.id,
          userId: currentUser,
        },
      });

      if (response.status === 200) {
        dispatch(groupActions.removeGroup(chat.id));
        toast.success("Successfully left the group");
        navigate("/");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group");
    }
  };

  // Add handler for initiating the leave process
  const initiateLeaveGroup = () => {
    setShowLeaveConfirmation(true);
  };

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
                    className={`${
                      theme === "dark" ? "text-white" : "text-black"
                    } text-2xl font-bold`}
                    minWidth={150}
                    charWidth={16}
                  />
                ) : (
                  <span
                    className={`${
                      theme === "dark" ? "text-white" : "text-black"
                    } text-2xl font-bold cursor-pointer hover:underline`}
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
                    className={clsx(
                      "text-2xl font-bold px-2 py-1 rounded",
                      theme === "dark"
                        ? "text-white bg-gray-700 focus:bg-gray-600"
                        : "text-black bg-gray-100"
                    )}
                    minWidth={150}
                    charWidth={16}
                  />
                ) : (
                  <span
                    className={clsx(
                      "text-2xl font-bold cursor-pointer hover:underline",
                      theme === "dark" ? "text-white" : "text-black"
                    )}
                    onClick={() => {
                      setEditedGroupTitle(groupName);
                      setEditingGroupTitle(true);
                    }}
                  >
                    {groupName}
                  </span>
                )
              ) : (
                <span
                  className={clsx(
                    "text-2xl font-bold",
                    theme === "dark" ? "text-white" : "text-black"
                  )}
                >
                  {chat.name}
                </span>
              )}
            </div>

            {chat.isGroup && (
              <div className="flex items-center gap-4">
                {hasCurrentEvent ? (
                  <Button
                    onClick={() => setShowEventDetails(true)}
                    color="dark1"
                    className="text-white"
                  >
                    {groupData?.currentEvent?.title}
                  </Button>
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
                <button className={inviteButton} onClick={initiateLeaveGroup}>
                  <LogOut className="w-6 h-6 text-red-500" />
                </button>
              </div>
            )}
          </div>

          <div className={messagesContainer}>
            {renderMessages(messages)}
            <div ref={messagesEndRef} />
          </div>

          <div className={inputSection}>
            <ImageUploader onFileSelect={handleImg} overlayText="+">
              <button className={plusButton}>+</button>
            </ImageUploader>
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
      <LeaveGroupModal
        isOpen={showLeaveConfirmation}
        onClose={() => setShowLeaveConfirmation(false)}
        onConfirm={() => {
          handleLeaveGroup();
          setShowLeaveConfirmation(false);
        }}
        groupName={chat.name}
      />
      <CancelEventModal
        isOpen={showCancelEventConfirmation}
        onClose={() => setShowCancelEventConfirmation(false)}
        onConfirm={confirmCancelEvent}
        eventTitle={groupData?.currentEvent?.title}
      />
    </div>
  );
};

export default React.memo(ChatView);
