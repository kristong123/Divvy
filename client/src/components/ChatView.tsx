import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { UserRound } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import chatSelectors from '../store/selectors/chatSelectors';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { sendMessage } from '../services/socketService';
import { setMessages, addMessage } from '../store/slice/chatSlice';

interface ChatViewProps {
  chat: {
    id: string;
    name: string;
    imageUrl?: string;
    amount?: string;  // For group chats
    lastMessage?: string;  // For direct messages
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

  // Use memoized selectors
  const friend = useSelector((state: RootState) => chatSelectors.selectFriend(state, chat.name));
  const messages = useSelector((state: RootState) => chatSelectors.selectChatMessages(state, chatId));

  const dispatch = useDispatch();

  const chatContainer = clsx(
    // Layout
    'flex flex-col h-screen',
    // Appearance
    'bg-white',
    // Overflow
    'overflow-hidden'
  );

  const chatHeader = clsx(
    // Layout
    'flex items-center',
    // Spacing
    'h-24',  // Match sidebar profile height (16px padding top/bottom + 40px content)
    'px-6'
  );

  const headerDivider = clsx(
    'h-0.5',
    'bg-gradient-to-r from-black to-white'
  );

  const chatAvatar = clsx(
    // Layout
    'w-14 h-14 rounded-full',
    'flex items-center justify-center',
    'bg-gradient-to-tr from-dark2 to-light1'
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
    'border-t border-gray-200',
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

  // Set up socket connection
  useEffect(() => {
    if (!currentUser) return;

    // Join user's room
    socket.emit('join', currentUser);

    // Listen for new messages
    socket.on('new-message', (data) => {
      if (data.chatId === [currentUser, chat.name].sort().join('_')) {
        // Add single message instead of replacing all messages
        dispatch(addMessage({ chatId: data.chatId, message: data.message }));
      }
    });

    // Cleanup
    return () => {
      socket.off('new-message');
      socket.emit('leave', currentUser);
    };
  }, [currentUser, chat.name, dispatch]); // Remove messages dependency

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    try {
      const messageData = {
        chatId,
        senderId: currentUser,
        receiverId: chat.name,
        content: inputText.trim(),
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      // Remove local dispatch, only send through socket
      sendMessage(messageData);
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
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
    <div className={chatContainer}>
      <div className={chatHeader}>
        <div className={chatAvatar}>
          {friend?.profilePicture ? (
            <img 
              src={friend.profilePicture} 
              alt={chat.name}
              className="w-5/6 h-5/6 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                toast.error(`Failed to load ${chat.name}'s profile picture`);
              }}
            />
          ) : (
            <UserRound className="w-4/5 h-4/5 text-white" />
          )}
        </div>
        <span className="text-black text-2xl font-bold ml-4">{chat.name}</span>
      </div>
      <div className={headerDivider}></div>

      <div className={messagesContainer}>
        {messages?.filter(message => message && message.senderId)?.map((message) => (
          <div 
            key={message.id} 
            className={clsx(
              messageBubble,
              message.senderId === currentUser ? 'justify-end' : 'justify-start'
            )}
          >
            <div className={clsx(
              messageContent,
              message.senderId === currentUser ? 'bg-[#57E3DC]' : 'bg-gray-100'
            )}>
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
  );
};

export default React.memo(ChatView); 