import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import chatSelectors from '../../store/selectors/chatSelectors';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import { sendMessage, getSocket, updateEvent } from '../../services/socketService';
import { addMessage, setMessages, setLoading } from '../../store/slice/chatSlice';
import { SocketMessageEvent, MessageData, Message } from '../../types/messages';
import ProfileAvatar from '../shared/ProfileAvatar';
import { UserPlus, ArrowLeft } from 'lucide-react';
import GroupMembers from '../groupchats/GroupMembers';
import InviteModal from '../modals/GroupInviteModal';
import { createSelector } from '@reduxjs/toolkit';
import { groupActions, Event } from '../../store/slice/groupSlice';
import GroupInvite from '../groupchats/GroupInvite';
import { addGroupInvite, removeGroupInvite } from '../../store/slice/inviteSlice';
import AddEventButton from '../groupchats/events/AddEventButton';
import EventDetailsView from '../groupchats/events/EventDetailsView';

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

interface MessageResponse {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  chatId: string;
}

// Add interface for group data
interface GroupJoinData {
  groupId: string;
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

// Create a stable selector outside the component
const selectChatMessages = createSelector(
  [(state: RootState) => state.groups.messages, 
   (state: RootState) => state.chat.messages],
  (groupMessages, chatMessages) => ({groupMessages, chatMessages})
);

const ChatView: React.FC<ChatViewProps> = ({ chat }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  
  const currentUser = useSelector((state: RootState) => state.user.username);
  const userProfile = useSelector((state: RootState) => state.user.profilePicture);
  
  const chatId = useMemo(() => 
    chat.isGroup ? `group_${chat.id}` : [currentUser, chat.name].sort().join('_'),
    [currentUser, chat.name, chat.id, chat.isGroup]
  );

  // Use the stable selector
  const { groupMessages, chatMessages } = useSelector(selectChatMessages);
  
  // Then extract the messages we need
  const messages = useMemo(() => 
    chat.isGroup ? (groupMessages[chat.id] || []) : (chatMessages[chatId] || []),
    [chat.isGroup, chat.id, chatId, groupMessages, chatMessages]
  ) as Message[];

  // Modify the message loading effect to always load messages when the chat changes
  useEffect(() => {
    // Check if we already have messages
    const hasMessages = messages.length > 0;
    
    if (!hasMessages) {
      if (!chat.isGroup) {
        dispatch(setLoading(true));
        axios.get(`${BASE_URL}/api/messages/${chatId}`)
          .then(response => {
            dispatch(setMessages({ chatId, messages: response.data }));
          })
          .catch((_error) => {
            console.error('Failed to load messages:', _error);
            toast.error('Failed to load messages');
          })
          .finally(() => {
            dispatch(setLoading(false));
          });
      } else if (chat.id) {
        dispatch(setLoading(true));
        axios.get(`${BASE_URL}/api/groups/${chat.id}/messages`)
          .then(response => {
            dispatch(groupActions.setGroupMessages({
              groupId: chat.id,
              messages: response.data
            }));
          })
          .catch((_error) => {
            console.error('Failed to fetch messages:', _error);
            toast.error('Failed to fetch messages');
          })
          .finally(() => {
            dispatch(setLoading(false));
          });
      }
    }
  }, [chatId, chat.isGroup, chat.id, dispatch, messages.length]);

  // Create memoized selectors
  const selectGroupData = useMemo(
    () => createSelector(
      [(state: RootState) => state.groups.groups, () => chat.id],
      (groups, chatId) => {
        const rawGroup = groups[chatId];

        if (!chat.isGroup || !rawGroup) return null;

        const result = {
          ...rawGroup,
          currentEvent: rawGroup.currentEvent ? {
            id: rawGroup.currentEvent.id,
            name: rawGroup.currentEvent.name,
            date: rawGroup.currentEvent.date,
            description: rawGroup.currentEvent.description,
            expenses: rawGroup.currentEvent.expenses || []
          } : null
        };
        return result;
      }
    ),
    [chat.id, chat.isGroup]
  );

  // Remove fullState selector and just use groupData
  const groupData = useSelector(selectGroupData);

  // Use memoized selectors
  const friend = useSelector((state: RootState) => chatSelectors.selectFriend(state, chat.name));

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

  const [showEventDetails, setShowEventDetails] = useState(false);

  // Update the check for current event
  const hasCurrentEvent = !!(groupData?.currentEvent?.id && groupData?.currentEvent?.name);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      dispatch(addGroupInvite({ 
        username: invite.invitedBy,
        invite 
      }));
      toast.success(`You've been invited to join ${invite.groupName}`);
    };

    const handleEventUpdate = (data: { groupId: string; event: Event | null }) => {
      if (data.groupId === chat.id) {
        const currentEvent = groupData?.currentEvent;
        const newEvent = data.event;
        
        if (JSON.stringify(currentEvent) !== JSON.stringify(newEvent)) {
          dispatch(groupActions.setGroupEvent({
            groupId: data.groupId,
            event: data.event
          }));
        }
      }
    };

    const handleGroupJoin = (data: GroupJoinData) => {
      if (data.groupId === chat.id) {
        dispatch(groupActions.updateGroup({
          ...data.group,
          currentEvent: data.group.currentEvent || groupData?.currentEvent
        }));
      }
    };

    socket.on('event-updated', handleEventUpdate);
    socket.on('new-message', handleNewMessage);
    socket.on('group-invite', handleGroupInvite);
    socket.on('group-invite-accepted', handleGroupJoin);
    socket.on('message-error', (error: MessageResponse) => {
      console.error('Message error:', error);
      toast.error('Failed to send message');
    });

    return () => {
      socket.off('event-updated', handleEventUpdate);
      socket.off('new-message', handleNewMessage);
      socket.off('group-invite', handleGroupInvite);
      socket.off('group-invite-accepted', handleGroupJoin);
    };
  }, [currentUser, chat.name, chat.id, chat.isGroup, dispatch, groupData?.currentEvent]);

  // Add this useEffect to automatically close event view when event is cleared
  useEffect(() => {
    if (!groupData?.currentEvent) {
      setShowEventDetails(false);
    }
  }, [groupData?.currentEvent]);

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
    } catch (_error) {
      console.error('Failed to send message:', _error);
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

  // Update the event cancellation handler
  const handleCancelEvent = () => {
    dispatch(groupActions.setGroupEvent({
      groupId: chat.id,
      event: null
    }));
    
    // Send explicit null to server
    updateEvent(chat.id, null);
    
    // Force immediate UI update
    setShowEventDetails(false);
    
    // Clear any residual event data
    dispatch(groupActions.setGroupEvent({
      groupId: chat.id,
      event: {
        id: '',
        name: '',
        date: '',
        description: '',
        expenses: []
      }
    }));
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
                <span className="text-black text-2xl font-bold">
                  {groupData.currentEvent.name}
                </span>
                <span className="text-gray-500 text-sm">
                  {new Date(groupData.currentEvent.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <EventDetailsView
              description={groupData.currentEvent.description}
              expenses={groupData.currentEvent.expenses}
              participants={groupData.users}
              currentUser={currentUser}
              onCancel={handleCancelEvent}
              groupId={chat.id}
            />
          </div>
        </div>
      ) : (
        <div className={chatContainer}>
          <div className={chatHeader}>
            <div className="flex items-center gap-4 mr-auto">
              <ProfileAvatar
                username={chat.name}
                imageUrl={friend?.profilePicture}
                size="md"
              />
              <span className="text-black text-2xl font-bold">{chat.name}</span>
            </div>
            
            {chat.isGroup && (
              <div className="flex items-center gap-4">
                {hasCurrentEvent ? (
                  <button 
                    onClick={() => setShowEventDetails(true)}
                    className="px-4 py-2 bg-[#57E3DC] rounded-lg text-white"
                  >
                    {groupData?.currentEvent?.name}
                  </button>
                ) : (
                  <AddEventButton 
                    onConfirm={(eventName: string, eventDate: string, description: string) => {
                      const newEvent = {
                        id: Date.now().toString(),
                        name: eventName,
                        date: eventDate,
                        description,
                        expenses: []
                      };
                      updateEvent(chat.id, newEvent);
                      dispatch(groupActions.setGroupEvent({
                        groupId: chat.id,
                        event: newEvent
                      }));
                    }}
                  />
                )}
                <button className={inviteButton} onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="w-6 h-6 text-[#57E3DC]" />
                </button>
              </div>
            )}
          </div>

          <div className={messagesContainer}>
            {groupInvites.length > 0 && (
              <div className="flex flex-col gap-2">
                {groupInvites.map((invite) => (
                  <GroupInvite
                    key={invite.id}
                    id={invite.id}
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
                    id={`${message.id}-${index}`}
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
      )}
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
          onInvite={async (usernames) => {
            try {
              // Send invites one by one with invitedBy field
              for (const username of usernames) {
                await axios.post(`${BASE_URL}/api/groups/invite`, {
                  groupId: chat.id,
                  username,
                  invitedBy: currentUser // Add the invitedBy field
                });
              }
              
              toast.success(`Invites sent to ${usernames.length} friend${usernames.length !== 1 ? 's' : ''}`);
            } catch (error) {
              // Type guard for AxiosError
              if (axios.isAxiosError(error)) {
                if (error.response) {
                  console.error('Invite error response:', error.response.data);
                }
                console.error('Failed to send invites:', error);
              }
              toast.error('Failed to send invites');
            }
          }}
        />
      )}
    </div>
  );
};

export default React.memo(ChatView); 