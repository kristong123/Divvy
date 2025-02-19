import React, { useState } from 'react';
import clsx from 'clsx';

interface CreateEventWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eventName: string, eventDate: string, description: string) => void;
}

const CreateEventWindow: React.FC<CreateEventWindowProps> = ({ isOpen, onClose, onConfirm }) => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (eventName.trim() && eventDate) {
      onConfirm(eventName.trim(), eventDate, description.trim());
      setEventName('');
      setEventDate('');
      setDescription('');
    }
  };

  const modalOverlay = clsx(
    'fixed inset-0',
    'flex items-center justify-center',
    'bg-black/50',
    'z-[1000]'
  );

  const modalContent = clsx(
    'w-[400px]',
    'p-6',
    'bg-white rounded-2xl',
    'shadow-lg'
  );

  const input = clsx(
    'w-full',
    'px-3 py-3',
    'my-4',
    'text-base text-black',
    'border border-gray-200 rounded-lg',
    'focus:outline-none focus:border-[#57E3DC]'
  );

  const textarea = clsx(
    input,
    'resize-none',
    'h-32'
  );

  const buttonContainer = clsx(
    'flex justify-end gap-3',
    'mt-6'
  );

  const baseButton = clsx(
    'px-4 py-2',
    'text-sm',
    'rounded-lg',
    'border-none',
    'cursor-pointer'
  );

  const secondaryButton = clsx(
    baseButton,
    'bg-gray-100 text-gray-700',
    'hover:bg-gray-200'
  );

  const primaryButton = clsx(
    baseButton,
    'bg-[#57E3DC] text-white',
    'hover:bg-[#4DC8C2]'
  );

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={modalContent} onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-medium text-black m-0">Create New Event</h2>
        <input
          type="text"
          placeholder="Enter event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className={input}
          autoFocus
        />
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className={input}
        />
        <textarea
          placeholder="Enter event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={textarea}
        />
        <div className={buttonContainer}>
          <button className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryButton} onClick={handleSubmit}>
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEventWindow; 