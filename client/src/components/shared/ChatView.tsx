import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import chatSelectors from '../../store/selectors/chatSelectors';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config/api';
import { sendMessage } from '../../services/socketService';
import { setMessages, addMessage } from '../../store/slice/chatSlice';
import { SocketMessageEvent, MessageData } from '../../types/messages';
import ProfileAvatar from '../shared/ProfileAvatar';
import { UserPlus } from 'lucide-react';
import GroupMembers from '../groups/GroupMembers';
import InviteModal from '../groups/InviteModal';
import { createSelector } from '@reduxjs/toolkit';
import { groupActions } from '../../store/slice/groupSlice';

interface ChatViewProps {
  chat: {
    id: string;
    name: string;
    imageUrl?: string;
    amount?: string;  // For group chats
    lastMessage?: string;  // For direct messages
    isGroup?: boolean;
  };
}

const socket = io(SOCKET_URL);

const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useSelector((state: RootState) => state.user.username);
  
  // Memoize the chatId calculation
  const chatId = useMemo(() => 
    [currentUser, chat.name].sort().join('_'),
    [currentUser, chat.name]
  );

  // Create memoized selectors
  const selectGroupData = useMemo(
    () => createSelector(
      [(state: RootState) => state.groups.groups, () => chat.id],
      (groups, chatId) => chat.isGroup ? groups[chatId] : null
    ),
    [chat.id, chat.isGroup]
  );

  // Memoize all selectors
  const selectGroupMessages = useMemo(
    () => createSelector(
      [(state: RootState) => state.groups.messages, () => chat.id],
      (messages, chatId) => messages[chatId] || []
    ),
    [chat.id]
  );

  const selectDirectMessages = useMemo(
    () => createSelector(
      [(state: RootState) => state.chat.messages, () => chatId],
      (messages, id) => messages[id] || []
    ),
    [chatId]
  );

  // Use memoized selectors
  const friend = useSelector((state: RootState) => chatSelectors.selectFriend(state, chat.name));
  const groupMessages = useSelector(selectGroupMessages);
  const directMessages = useSelector(selectDirectMessages);
  
  // Use group messages for group chats, direct messages otherwise
  const messages = chat.isGroup ? groupMessages : directMessages;
  const groupData = useSelector(selectGroupData);

  const dispatch = useDispatch();

  const chatContainer = clsx(
    // Layout
    'flex flex-col flex-1 h-screen',
    // Appearance
    'bg-white',
    // Overflow
    'overflow-hidden'
  );

  const chatHeader = clsx(
    // Layout
    'flex items-center',
    // Spacing
    'h-24 px-6',
    // Width
    'w-full',
    // Border
    'border-b'
  );

  const messagesContainer = clsx(
    // Layout
    'flex-1 flex flex-col',
    // Spacing
    'gap-4 p-5',
    // Overflow
    'overflow-y-auto min-h-0 max-h-full',
    // Scrollbar
    'scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent'
  );

  const inputSection = clsx(
    // Layout
    'flex items-center',
    // Spacing
    'px-4 py-2',
    // Border
    'border-t',
    // Appearance
    'bg-white'
  );

  const plusButton = clsx(
    // Layout
    'w-8 h-8',
    'flex items-center justify-center',
    // Appearance
    'rounded-full',
    'bg-gradient-to-tr from-[#57E3DC] to-white',
    // Typography
    'text-black text-xl',
    // Interactive
    'cursor-pointer'
  );

  const input = clsx(
    // Layout
    'flex-1',
    // Spacing
    'px-4 py-2 mx-3',
    // Appearance
    'rounded-full',
    'bg-gray-100',
    // Typography
    'text-black',
    // Focus
    'focus:outline-none focus:bg-gray-200',
    // Placeholder
    'placeholder:text-gray-600'
  );

  const messageBubble = clsx(
    // Layout
    'flex gap-2 items-start',
    // Spacing
    'my-2'
  );

  const messageContent = clsx(
    // Layout
    'max-w-[70%]',
    // Spacing
    'px-3 py-2',
    // Appearance
    'bg-gray-100 rounded-xl',
    // Typography
    'text-black'
  );

  const messageTime = clsx(
    // Typography
    'text-xs text-gray-600',
    // Spacing
    'ml-2'
  );

  const [showInviteModal, setShowInviteModal] = useState(false);

  const inviteButton = clsx(
    // Position
    'ml-auto',
    // Spacing
    'p-2',
    // Appearance
    'rounded-full',
    // Interactive
    'hover:bg-gray-100',
    // Transitions
    'transition-colors duration-200'
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when chat opens
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/messages/${chatId}`);
        dispatch(setMessages({ chatId, messages: response.data }));
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      }
    };

    if (currentUser && chat.name) {
      loadMessages();
    }
  }, [currentUser, chat.name, chatId, dispatch]);

  // Fetch messages when entering a chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (chat.isGroup && chat.id) {
        try {
          const response = await axios.get(`${BASE_URL}/api/groups/${chat.id}/messages`);
          dispatch(groupActions.setGroupMessages({
            groupId: chat.id,
            messages: response.data
          }));
        } catch (error) {
          toast.error('Failed to fetch messages');
        }
      }
    };

    fetchMessages();
  }, [chat.id, chat.isGroup, dispatch]);

  // Update the socket listener
  useEffect(() => {
    if (!currentUser) return;

    socket.emit('join', currentUser);

    socket.on('new-message', (data: SocketMessageEvent) => {
      if (data.chatId === [currentUser, chat.name].sort().join('_')) {
        dispatch(addMessage({ chatId: data.chatId, message: data.message }));
      }
    });

    socket.on('new-group-message', (data: SocketMessageEvent) => {
      if (chat.isGroup && data.groupId === chat.id) {
        dispatch(groupActions.addGroupMessage({
          groupId: chat.id,
          message: data.message
        }));
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('new-group-message');
      socket.emit('leave', currentUser);
    };
  }, [currentUser, chat.name, chat.id, chat.isGroup, dispatch]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    const messageData: MessageData = {
        chatId: chat.isGroup ? `group_${chat.id}` : chatId,  // Add 'group_' prefix for groups
        senderId: currentUser,
        receiverId: chat.isGroup ? 'group' : chat.name,
        content: inputText,
        timestamp: new Date().toISOString(),
        status: 'sent'
    };

    try {
        await sendMessage(messageData);
        setInputText('');
    } catch (error) {
        toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex w-full h-screen">
      <div className={chatContainer}>
        <div className={chatHeader}>
          <ProfileAvatar
            username={chat.name}
            imageUrl={friend?.profilePicture}
            size="md"
          />
          <span className="text-black text-2xl font-bold ml-4">{chat.name}</span>
          {chat.isGroup && (
            <button className={inviteButton} onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-6 h-6 text-[#57E3DC]" />
            </button>
          )}
        </div>

        <div className={messagesContainer}>
          {messages?.map((message) => (
            <div 
              key={`${message.id}-${message.timestamp}`}
              className={clsx(
                messageBubble,
                message.senderId === currentUser ? 'justify-end' : 'justify-start'
              )}
            >
              <div className={clsx(
                messageContent,
                message.senderId === currentUser ? 'bg-[#57E3DC]' : 'bg-gray-100'
              )}>
                {!chat.isGroup && message.senderId !== currentUser && (
                  <span className="text-xs text-gray-500">{message.senderId}</span>
                )}
                {message.content}
                <span className={messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))}
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
      {chat.isGroup && groupData && (
        <GroupMembers 
          members={groupData.users || []} 
          adminUsername={groupData.admin || ''} 
        />
      )}
      {chat.isGroup && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          groupId={chat.id}
          groupName={chat.name}
        />
      )}
    </div>
  );
};

export default React.memo(ChatView); 