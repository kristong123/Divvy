import React from "react";

interface FloatingButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  position: "bottom-left" | "bottom-right";
}

const FloatingButton: React.FC<FloatingButtonProps> = ({
  icon,
  onClick,
  position,
}) => {
  const positionClasses = {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <button
      className={`absolute ${positionClasses[position]} p-2 rounded-full bg-gradient-to-tr from-[#57E3DC] to-white cursor-pointer hover:scale-110 transition-transform duration-300`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
};

export default FloatingButton;
