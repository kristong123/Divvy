import React, { useState } from 'react';
import Modal from '../shared/Modal';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eventName: string, eventDate: string, description: string) => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (eventName.trim() && eventDate) {
      onConfirm(eventName.trim(), eventDate, description.trim());
      setEventName('');
      setEventDate('');
      setDescription('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Event"
      actionButton={{
        text: "Create Event",
        onClick: handleSubmit,
        disabled: !eventName.trim() || !eventDate,
        color: "primary"
      }}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Enter event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="w-full px-3 py-3 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full px-3 py-3 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          placeholder="Enter event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-3 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
        />
      </div>
    </Modal>
  );
};

export default CreateEventModal; 