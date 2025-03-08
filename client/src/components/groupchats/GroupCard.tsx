<<<<<<< Updated upstream
import React from "react";
import clsx from "clsx";
=======
import React from 'react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext'; // ✅ Import the theme hook
>>>>>>> Stashed changes

interface GroupCardProps {
  name: string;
  imageUrl?: string;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ name, imageUrl, onClick }) => {
  const { theme } = useTheme(); // ✅ Get the current theme

  const card = clsx(
    // Layout
    "w-48 h-48",
    "flex flex-col",
    "relative",
    // Spacing
<<<<<<< Updated upstream
    "p-2",
    // Appearance
    "bg-white rounded-2xl",
    "shadow-md",
=======
    'p-2',
    // Appearance - Use dynamic colors instead of hardcoded white
    theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-black",
    'rounded-2xl',
    'shadow-md',
>>>>>>> Stashed changes
    // Interactive
    "cursor-pointer"
  );

  const photoContainer = clsx(
    // Layout
    "flex-1 w-full",
    // Appearance
<<<<<<< Updated upstream
    "rounded-xl",
    "bg-gray-100",
=======
    'rounded-xl',
    theme === "dark" ? "bg-gray-700" : "bg-gray-100", // ✅ Ensure background updates
>>>>>>> Stashed changes
    // Spacing
    "mb-6",
    // Overflow
    "overflow-hidden"
  );

  const image = clsx(
    // Layout
    "w-full h-full",
    // Image
    "object-cover"
  );

  const groupName = clsx(
    // Position
    "absolute bottom-2 left-2",
    // Typography
<<<<<<< Updated upstream
    "text-sm font-bold text-black"
=======
    'text-sm font-bold',
    theme === "dark" ? "text-white" : "text-black" // ✅ Ensure text follows theme
>>>>>>> Stashed changes
  );

  return (
    <div className={card} onClick={onClick}>
      <div className={photoContainer}>
        {imageUrl && <img className={image} src={imageUrl} alt={name} />}
      </div>
      <div className={groupName}>{name}</div>
    </div>
  );
};

export default GroupCard;
