import React, { useMemo } from 'react';
import { UserRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface ProfileAvatarProps {
  username: string;
  size?: number; // Use numeric size instead of preset sizes
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  username, 
  size = 32, // Default size of 32px
}) => {
  // Get data from Redux store
  const groups = useSelector((state: RootState) => state.groups.groups);
  const friends = useSelector((state: RootState) => state.friends.friends);
  
  // Find profile picture based on username
  const imageUrl = useMemo(() => {
    // Check in groups first
    for (const groupId in groups) {
      const user = groups[groupId].users.find(u => u.username === username);
      if (user?.profilePicture) {
        return user.profilePicture;
      }
    }
    
    // Then check in friends list
    const friend = friends.find(f => f.username === username);
    if (friend?.profilePicture) {
      return friend.profilePicture;
    }
    
    return null;
  }, [username, groups, friends]);

  return (
    <div 
      className="relative flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-dark2 to-light1"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={username}
          className="w-5/6 h-5/6 object-cover rounded-full"
          onError={(e) => {
            e.currentTarget.src = '';
            toast.error(`Failed to load ${username}'s profile picture`);
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-slate-300">
          <UserRound className="text-white w-3/4 h-3/4" />
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar; 