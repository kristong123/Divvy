import React, { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import AddGroupButton from './groupchats/AddGroupButton';
import GroupCard from './groupchats/GroupCard';
import ChatView from './shared/ChatView';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { BASE_URL } from '../config/api';
import { RootState } from '../store/store';
import { groupActions } from '../store/slice/groupSlice';

interface GroupMember {
  username: string;
  profilePicture: string | null;
  isAdmin: boolean;
}

interface Group {
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
}

interface DirectChat {
  id: string;
  name: string;
  imageUrl?: string;
  lastMessage?: string;
}

const Main: React.FC = () => {
  const username = useSelector((state: RootState) => state.user.username);
  const groups = useSelector((state: RootState) => state.groups.groups);
  
  const groupsList = useMemo(() => 
    Object.values(groups) as Group[],
    [groups]
  );
  const dispatch = useDispatch();
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<{
    type: 'group' | 'direct';
    data: Group | DirectChat | null;
  }>({ type: 'group', data: null });

  const titleLink = clsx(
    // Layout
    'ml-96 mt-6',
    // Typography
    'text-5xl font-bold',
    'text-[#57E3DC]'
  );

  const groupsContainer = clsx(
    // Layout
    'flex flex-wrap',
    // Spacing
    'gap-4 p-10'
  );

  useEffect(() => {
    const fetchGroups = async () => {
      if (username) {
        try {
          const response = await axios.get(`${BASE_URL}/api/groups/user/${username}`);
          const formattedGroups = response.data.map((group: any) => ({
            ...group,  // Keep all original data including currentEvent
            isGroup: true
          }));
          dispatch(groupActions.setGroups(formattedGroups));
        } catch (error) {
          toast.error('Failed to fetch groups');
        }
      }
    };

    fetchGroups();
  }, [username, dispatch]);

  const handleCreateGroup = async (groupName: string) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/groups/create`, {
        name: groupName,
        createdBy: username
      });

      const newGroup: Group = {
        id: response.data.id,
        name: response.data.name,
        isGroup: true,
        users: response.data.users.map((user: any) => ({
          username: user.username,
          profilePicture: user.profilePicture,
          isAdmin: user.isAdmin
        })),
        admin: response.data.admin,
        createdBy: response.data.createdBy,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt
      };

      dispatch(groupActions.addGroup(newGroup));
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleDirectChatClick = (chatId: string) => {
    let chat = directChats.find(c => c.id === chatId);
    
    // If chat doesn't exist, create it
    if (!chat) {
      chat = {
        id: chatId,
        name: chatId, // Using username as name for now
        lastMessage: ''
      };
      setDirectChats([...directChats, chat]);
    }
    
    setSelectedChat({ type: 'direct', data: chat });
  };

  const handleGroupClick = (group: Group) => {
    setSelectedChat({ 
      type: 'group', 
      data: {
        id: group.id,
        name: group.name,
        imageUrl: group.imageUrl,
        amount: group.amount,
        isGroup: true,
        users: group.users
      }
    });
  };

  return (
    <div className="flex w-screen h-screen bg-white">
      <Sidebar 
        onChatSelect={handleDirectChatClick} 
        onHomeClick={() => setSelectedChat({ type: 'group', data: null })}
      />
      <div className='flex flex-col w-full'>
        {!selectedChat.data ? (
          <>
            <h1 className={titleLink}>Divvy</h1>
            <div className={groupsContainer}>
              {groupsList.map(group => (
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
    </div>
  );
};

export default Main;