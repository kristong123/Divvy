import React from 'react';
import clsx from 'clsx';

interface GroupCardProps {
  name: string;
  imageUrl?: string;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ name, imageUrl, onClick }) => {
  const card = clsx(
    // Layout
    'w-48 h-48',
    'flex flex-col',
    'relative',
    // Spacing
    'p-2',
    // Appearance
    'bg-white rounded-2xl',
    'shadow-md',
    // Interactive
    'cursor-pointer'
  );

  const photoContainer = clsx(
    // Layout
    'flex-1 w-full',
    // Appearance
    'rounded-xl',
    'bg-gray-100',
    // Spacing
    'mb-6',
    // Overflow
    'overflow-hidden'
  );

  const image = clsx(
    // Layout
    'w-full h-full',
    // Image
    'object-cover'
  );

  const groupName = clsx(
    // Position
    'absolute bottom-2 left-2',
    // Typography
    'text-sm font-bold text-black'
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