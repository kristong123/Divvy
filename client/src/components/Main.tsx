import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import AddGroupButton from './AddGroupButton';
import GroupCard from './GroupCard';
import ChatView from './ChatView';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { BASE_URL } from '../config/api';
import { RootState } from '../store/store';

interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  amount?: string;
}

interface DirectChat {
  id: string;
  name: string;
  imageUrl?: string;
  lastMessage?: string;
}

const Main: React.FC = () => {
  const username = useSelector((state: RootState) => state.user.username);
  const [groups, setGroups] = useState<Group[]>([]);
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
          setGroups(response.data);
        } catch (error) {
          console.error('Fetch groups error:', error);
          toast.error('Failed to fetch groups');
        }
      }
    };

    fetchGroups();
  }, [username]);

  const handleCreateGroup = async (groupName: string) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/groups/create`, {
        name: groupName,
        createdBy: username
      });

      const newGroup: Group = {
        id: response.data.id,
        name: response.data.name,
      };
      setGroups([...groups, newGroup]);
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
              {groups.map(group => (
                <GroupCard
                  key={group.id}
                  name={group.name}
                  imageUrl={group.imageUrl}
                  onClick={() => setSelectedChat({ type: 'group', data: group })}
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