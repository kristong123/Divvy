import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: string;
}

interface GroupChatViewProps {
  group: {
    id: string;
    name: string;
    amount?: string;
  };
}

const ChatView: React.FC<GroupChatViewProps> = ({ group }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatContainer = clsx(
    // Layout
    'flex flex-col h-[calc(100vh-80px)]',
    // Appearance
    'bg-white',
    // Overflow
    'overflow-hidden'
  );

  const header = clsx(
    // Layout
    'flex items-center',
    // Spacing
    'px-6 py-4',
    // Border
    'border-b border-gray-200'
  );

  const groupTitle = clsx(
    // Layout
    'flex items-center flex-1',
    // Spacing
    'gap-3'
  );

  const groupName = clsx(
    // Typography
    'text-lg font-bold text-black'
  );

  const amount = clsx(
    // Typography
    'text-sm text-gray-600'
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

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        timestamp: new Date(),
        sender: 'You'
      };
      setMessages([...messages, newMessage]);
      setInputText('');
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
      <div className={header}>
        <div className={groupTitle}>
          <h2 className={groupName}>{group.name}</h2>
          {group.amount && <div className={amount}>${group.amount}</div>}
        </div>
      </div>

      <div className={messagesContainer}>
        {messages.map((message) => (
          <div key={message.id} className={messageBubble}>
            <div className={messageContent}>
              {message.text}
              <span className={messageTime}>
                {message.timestamp.toLocaleTimeString([], { 
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

export default ChatView; 