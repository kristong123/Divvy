import React from 'react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext'; 

interface GroupCardProps {
  name: string;
  imageUrl?: string;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ name, imageUrl, onClick }) => {
  const { theme } = useTheme(); 

  const card = clsx(
    // Layout
    "w-48 h-48",
    "flex flex-col",
    "relative",
    // Spacing
    'p-2',
    // Appearance - Use dynamic colors instead of hardcoded white
    theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-black",
    'rounded-2xl',
    'shadow-md',
    // Interactive
    "cursor-pointer"
  );

  const photoContainer = clsx(
    // Layout
    "flex-1 w-full",
    // Appearance
    'rounded-xl',
    theme === "dark" ? "bg-gray-700" : "bg-gray-100", 
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
    'text-sm font-bold',
    theme === "dark" ? "text-white" : "text-black" 
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
