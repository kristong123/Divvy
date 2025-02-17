import React from 'react';
import { UserRound } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

interface ProfileAvatarProps {
  username: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  username, 
  imageUrl, 
  size = 'md',
  onClick 
}) => {
  const container = clsx(
    // Layout
    'flex rounded-full',
    // Appearance
    'bg-gradient-to-br from-dark2 to-light1',
    // Position
    'relative',
    // Interactive
    onClick && 'cursor-pointer',
    // Sizes
    {
      'w-8 h-8': size === 'sm',
      'w-14 h-14': size === 'md',
      'w-16 h-16': size === 'lg'
    }
  );

  const innerContainer = clsx(
    // Layout
    'm-auto'
  );

  const defaultAvatar = clsx(
    // Layout
    'flex rounded-full',
    // Appearance
    'bg-slate-300',
    // Sizes
    {
      'w-7 h-7': size === 'sm',
      'w-12 h-12': size === 'md',
      'w-14 h-14': size === 'lg'
    }
  );

  const defaultIcon = clsx(
    // Layout
    'm-auto',
    // Size
    'w-3/4 h-3/4',
    // Appearance
    'text-white'
  );

  const profileImage = clsx(
    // Layout
    'rounded-full object-cover',
    // Sizes
    {
      'w-7 h-7': size === 'sm',
      'w-12 h-12': size === 'md',
      'w-14 h-14': size === 'lg'
    }
  );

  return (
    <div className={container} onClick={onClick}>
      <div className={innerContainer}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={username}
            className={profileImage}
            onError={(e) => {
              e.currentTarget.src = '';
              toast.error(`Failed to load ${username}'s profile picture`);
            }}
          />
        ) : (
          <div className={defaultAvatar}>
            <UserRound className={defaultIcon}/>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileAvatar; 