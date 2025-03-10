import React, { useState } from "react";
import CreateEventWindow from "../../modals/CreateEventModal";
import clsx from "clsx";
import { useTheme } from "../../../context/ThemeContext";

interface AddEventButtonProps {
  onConfirm: (
    eventName: string,
    eventDate: string,
    description: string
  ) => void;
}

const AddEventButton: React.FC<AddEventButtonProps> = ({ onConfirm }) => {
  const { theme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateEvent = (
    eventName: string,
    eventDate: string,
    description: string
  ) => {
    onConfirm(eventName, eventDate, description);
    setIsModalOpen(false);
  };

  const buttonContainer = clsx(
    "w-10 h-10",
    "flex items-center justify-center",
    "rounded-full",
    "shadow-md",
    "cursor-pointer",
    theme === "dark"
      ? "bg-gray-700 hover:bg-gray-600"
      : "bg-white hover:bg-gray-50"
  );

  const plusButton = clsx(
    "w-6 h-6",
    "flex items-center justify-center",
    "rounded-full",
    theme === "dark"
      ? "bg-gradient-to-tr from-[#57E3DC] to-gray-800"
      : "bg-gradient-to-tr from-[#57E3DC] to-white",
    "text-black text-lg",
    "pb-0.5"
  );

  return (
    <>
      <div className={buttonContainer} onClick={() => setIsModalOpen(true)}>
        <div className={plusButton}>📅</div>
      </div>

      <CreateEventWindow
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreateEvent}
      />
    </>
  );
};

export default AddEventButton;
