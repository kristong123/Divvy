import React, { useState, useEffect, useMemo } from "react";
import clsx from "clsx";
import Sidebar from "./Sidebar";
import AddGroupButton from "./groupchats/AddGroupButton";
import GroupCard from "./groupchats/GroupCard";
import ChatView from "./shared/ChatView";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import { BASE_URL } from "../config/api";
import { RootState } from "../store/store";
import { groupActions } from "../store/slice/groupSlice";
import { useTheme } from "../context/ThemeContext";
import { Settings } from "lucide-react";
import FloatingButton from "./shared/FloatingButton";
import SettingsModal from "./modals/SettingsModal";

interface GroupMember {
  username: string;
  profilePicture: string | null;
  isAdmin: boolean;
}

interface GroupData {
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
  notificationType?: string;
}

interface DirectChat {
  id: string;
  name: string;
  imageUrl?: string;
  lastMessage?: string;
}

// Add interface for the API response
interface GroupResponse {
  id: string;
  name: string;
  currentEvent: Event; // Use the Event type from your groupSlice
  users: UserResponse[];
  admin: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// For handleCreateGroup:
interface UserResponse {
  username: string;
  profilePicture: string | null;
  isAdmin: boolean;
}

const Main: React.FC = () => {
  const { theme } = useTheme();
  const username = useSelector((state: RootState) => state.user.username);
  const groups = useSelector((state: RootState) => state.groups.groups);

  const groupsList = useMemo(
    () => Object.values(groups) as GroupData[],
    [groups]
  );
  const dispatch = useDispatch();
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<{
    type: "group" | "direct";
    data: GroupData | DirectChat | null;
  }>({ type: "group", data: null });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const titleLink = clsx(
    // Layout
    "ml-96 mt-6",
    // Typography
    "text-5xl font-bold",
    "text-dark1"
  );

  const groupsContainer = clsx(
    // Layout
    "flex flex-wrap",
    // Spacing
    "gap-4 p-10"
  );

  useEffect(() => {
    const fetchGroups = async () => {
      if (username) {
        try {
          const response = await axios.get(
            `${BASE_URL}/api/groups/user/${username}`
          );
          const groups = response.data.map((group: GroupResponse) => ({
            ...group,
            isGroup: true,
          }));
          dispatch(groupActions.setGroups(groups));
        } catch (_error) {
          console.error("Failed to fetch groups:", _error);
          toast.error("Failed to fetch groups");
        }
      }
    };

    fetchGroups();
  }, [username, dispatch]);

  const handleCreateGroup = async (groupName: string) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/groups/create`, {
        name: groupName,
        createdBy: username,
        pendingInvites: [],
      });

      const newGroup: GroupData = {
        id: response.data.id,
        name: response.data.name,
        isGroup: true,
        users: response.data.users.map((user: UserResponse) => ({
          username: user.username,
          profilePicture: user.profilePicture,
          isAdmin: user.isAdmin,
        })),
        admin: response.data.admin,
        createdBy: response.data.createdBy,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
      };

      dispatch(groupActions.addGroup(newGroup));
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    }
  };

  const handleDirectChatClick = (chatId: string, notificationType?: string) => {
    // Check if this is a group ID
    const group = groupsList.find((g) => g.id === chatId);

    if (group) {
      // It's a group, handle it as a group click
      handleGroupClick(group, notificationType);
      return;
    }

    // Otherwise handle as a direct chat
    let chat = directChats.find((c) => c.id === chatId);

    // If chat doesn't exist, create it
    if (!chat) {
      chat = {
        id: chatId,
        name: chatId,
        lastMessage: "",
      };
      setDirectChats([...directChats, chat]);
    }

    setSelectedChat({ type: "direct", data: chat });
  };

  const handleGroupClick = (group: GroupData, notificationType?: string) => {
    // Store just the ID and get the latest data from Redux when rendering
    setSelectedChat({
      type: "group",
      data: {
        id: group.id,
        name: group.name,
        imageUrl: group.imageUrl,
        amount: group.amount,
        isGroup: true,
        notificationType,
      },
    });
  };

  return (
    <div
      className={`flex w-screen h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}
    >
      <Sidebar
        onChatSelect={handleDirectChatClick}
        onHomeClick={() => setSelectedChat({ type: "group", data: null })}
      />
      <div className="flex flex-col w-full">
        {!selectedChat.data ? (
          <>
            <h1 className={titleLink}>Divvy</h1>
            <div className={groupsContainer}>
              {groupsList.map((group) => (
                <GroupCard
                  key={group.id}
                  name={group.name}
                  imageUrl={group.imageUrl}
                  onClick={() => handleGroupClick(group)}
                />
              ))}
              <AddGroupButton onConfirm={handleCreateGroup} />
            </div>
          </>
        ) : (
          <ChatView chat={selectedChat.data} />
        )}
      </div>

      {/* Settings Button */}
      <FloatingButton
        icon={<Settings className="h-6 w-6 text-black" />}
        onClick={() => setIsSettingsModalOpen(true)}
        position="bottom-right"
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default Main;
