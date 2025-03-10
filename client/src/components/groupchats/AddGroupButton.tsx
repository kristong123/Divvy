import React, { useState } from "react";
import CreateGroupWindow from "../modals/CreateGroupModal";
import clsx from "clsx";
import { useTheme } from "../../context/ThemeContext";

interface AddGroupButtonProps {
  onConfirm: (groupName: string) => void;
}

const AddGroupButton: React.FC<AddGroupButtonProps> = ({ onConfirm }) => {
  const { theme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateGroup = (groupName: string) => {
    onConfirm(groupName);
    setIsModalOpen(false);
  };

  const buttonContainer = clsx(
    // Layout
    "w-48 h-48",
    "flex items-center justify-center",
    // Appearance
    "rounded-2xl shadow-md",
    theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black",
    // Interactive
    "cursor-pointer"
  );

  const plusButton = clsx(
    // Layout
    "w-10 h-10",
    "flex items-center justify-center pb-1",
    // Appearance
    "rounded-full",
    theme === "dark"
      ? "bg-gradient-to-tr from-[#57E3DC] to-gray-800 text-white"
      : "bg-gradient-to-tr from-[#57E3DC] to-white text-black",
    "text-black text-2xl",
    // Spacing
    "pb-0.5"
  );

  return (
    <>
      <div className={buttonContainer} onClick={() => setIsModalOpen(true)}>
        <div className={plusButton}>+</div>
      </div>

      <CreateGroupWindow
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreateGroup}
      />
    </>
  );
};

export default AddGroupButton;
