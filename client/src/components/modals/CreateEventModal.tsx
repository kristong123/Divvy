import React, { useState } from "react";
import Modal from "../shared/Modal";
import { preventEnterKeySubmission } from "../../utils/keyboardUtils";

// Helper function to get today's date in YYYY-MM-DD format
const getTodayFormatted = (): string => {
  const today = new Date();

  // Get the UTC values to avoid timezone issues
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(today.getUTCDate()).padStart(2, "0");

  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
};

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    eventName: string,
    eventDate: string,
    description: string
  ) => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (eventName.trim()) {
      // Use current date if no date is provided
      const finalDate = eventDate || getTodayFormatted();
      onConfirm(eventName.trim(), finalDate, description.trim());
      setEventName("");
      setEventDate("");
      setDescription("");
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
        disabled: !eventName.trim(),
        color: "primary",
      }}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Enter event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          onKeyDown={preventEnterKeySubmission}
          className="w-full px-3 py-3 text-base text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          autoFocus
        />
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          onKeyDown={preventEnterKeySubmission}
          className="w-full px-3 py-3 text-base text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          placeholder="Optional - Today's date will be used if empty"
        />
        <textarea
          placeholder="Enter event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={preventEnterKeySubmission}
          className="w-full px-3 py-3 text-base text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32 bg-white dark:bg-gray-800"
        />
      </div>
    </Modal>
  );
};

export default CreateEventModal;
