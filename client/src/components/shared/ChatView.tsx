import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import chatSelectors from '../../store/selectors/chatSelectors';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import { sendMessage, getSocket } from '../../services/socketService';
import { setMessages, addMessage } from '../../store/slice/chatSlice';
import { SocketMessageEvent, MessageData, Message } from '../../types/messages';
import ProfileAvatar from '../shared/ProfileAvatar';
import { UserPlus } from 'lucide-react';
import GroupMembers from '../groups/GroupMembers';
import InviteModal from '../groups/InviteModal';
import { createSelector } from '@reduxjs/toolkit';
import { groupActions } from '../../store/slice/groupSlice';
import GroupInvite from '../groups/GroupInvite';
import { addGroupInvite, removeGroupInvite } from '../../store/slice/inviteSlice';

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

interface GroupInviteData {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
}

const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useSelector((state: RootState) => state.user.username);
  const userProfile = useSelector((state: RootState) => state.user.profilePicture);
  
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
  const messages = (chat.isGroup ? groupMessages : directMessages) as Message[];
  const groupData = useSelector(selectGroupData);

  const dispatch = useDispatch();

  const chatContainer = clsx(
    // Layout
    'flex flex-col flex-1',
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
    'flex flex-col h-full',
    // Spacing
    'gap-4 p-5',
    // Overflow
    'overflow-y-auto',
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

  const messageContainer = (isOwnMessage: boolean) => clsx(
    // Layout
    'flex w-full',
    // Alignment
    isOwnMessage ? 'flex-row-reverse' : 'flex-row'
  );

  const messageContent = (isOwnMessage: boolean) => clsx(
    // Layout
    'flex flex-col',
    // Spacing
    'w-fit min-w-0',
    // Alignment
    isOwnMessage ? 'items-end' : 'items-start'
  );

  const senderName = clsx(
    // Typography
    'text-xs text-gray-600',
    // Spacing
    'mb-1 ml-2'
  );

  const messageStyle = (isOwnMessage: boolean) => clsx(
    // Layout
    'w-fit max-w-full',
    // Spacing
    'px-3 py-2',
    // Appearance
    'bg-gray-100 rounded-xl',
    // Typography
    'text-black break-all',
    // Alignment
    isOwnMessage ? 'bg-light1' : 'bg-gray-100'
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

  const selectGroupInvites = useMemo(
    () => createSelector(
      [(state: RootState) => state.invites.groupInvites, (state: RootState) => state.user.username],
      (groupInvites, username) => groupInvites[username || ''] || []
    ),
    []
  );

  const groupInvites = useSelector(selectGroupInvites);

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

    const socket = getSocket();

    const handleNewMessage = (data: SocketMessageEvent) => {
      if (data.chatId === [currentUser, chat.name].sort().join('_')) {
        dispatch(addMessage({ chatId: data.chatId, message: data.message }));
      }
    };

    const handleGroupInvite = (invite: GroupInviteData) => {
      console.log('Received group invite:', invite);
      dispatch(addGroupInvite({ 
        username: invite.invitedBy,
        invite 
      }));
      toast.success(`You've been invited to join ${invite.groupName}`);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('group-invite', handleGroupInvite);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('group-invite', handleGroupInvite);
    };
  }, [currentUser, chat.name, chat.id, chat.isGroup, dispatch]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    const messageData: MessageData = {
      chatId: chat.isGroup ? `group_${chat.id}` : chatId,
      senderId: currentUser,
      receiverId: chat.isGroup ? 'group' : chat.name,
      content: inputText,
      timestamp: new Date().toISOString(),
      status: 'sent',
      senderName: currentUser,
      senderProfile: userProfile
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

  const handleAcceptInvite = (inviteId: string) => {
    dispatch(removeGroupInvite({ 
      username: chat.name,
      inviteId 
    }));
  };

  return (
    <div className="flex w-full h-full">
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
          {groupInvites.length > 0 && (
            <div className="flex flex-col gap-2">
              {groupInvites.map((invite) => (
                <GroupInvite
                  key={invite.id}
                  groupId={invite.groupId}
                  groupName={invite.groupName}
                  invitedBy={invite.invitedBy}
                  messageId={invite.id}
                  onAccept={() => handleAcceptInvite(invite.id)}
                />
              ))}
            </div>
          )}
          {messages.map((message, index) => {
            const isOwnMessage = message.senderId === currentUser;
            
            // Handle group invite messages
            if (message.type === 'group-invite') {
              return (
                <GroupInvite
                  key={`${message.id}-${index}`}
                  groupId={message.groupId || ''}
                  groupName={message.groupName || ''}
                  invitedBy={message.invitedBy || ''}
                  messageId={message.id || ''}
                  onAccept={() => handleAcceptInvite(message.id || '')}
                />
              );
            }
            
            return (
              <div key={`${message.id}-${index}`} className={messageContainer(isOwnMessage)}>
                {!isOwnMessage && message.type !== 'system' && (
                  <ProfileAvatar
                    username={message.senderName}
                    imageUrl={message.senderProfile}
                    size="sm"
                  />
                )}
                <div className={messageContent(isOwnMessage)}>
                  {!isOwnMessage && message.type !== 'system' && (
                    <span className={senderName}>{message.senderName}</span>
                  )}
                  {message.type === 'system' ? (
                    <span className="text-gray-500 text-sm italic text-center">
                      {message.content}
                    </span>
                  ) : (
                    <div className={messageStyle(isOwnMessage)}>
                      {message.content}
                    </div>
                  )}
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