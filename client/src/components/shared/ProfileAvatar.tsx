import React, { useMemo } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

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
      const user = groups[groupId].users.find((u) => u.username === username);
      if (user?.profilePicture) {
        return user.profilePicture;
      }
    }

    // Then check in friends list
    const friend = friends.find((f) => f.username === username);
    if (friend?.profilePicture) {
      return friend.profilePicture;
    }

    return null;
  }, [username, groups, friends]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = "";
    toast.error(`Failed to load ${username}'s profile picture`);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map(part => part.charAt(0)).join('');
  };

  return (
    <div
      className="relative flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-dark2 to-light1"
      style={{ width: `${size}px`, height: `${size}px` }}
      data-username={username}
    >
      {imageUrl ? (
        <img
          key={imageUrl}
          src={imageUrl}
          alt={username}
          className="w-[90%] h-[90%] object-cover rounded-full"
          onError={handleImageError}
        />
      ) : (
        <div className="flex items-center rounded-full justify-center w-[90%] h-[90%] bg-slate-300">
          <span className="text-white">{getInitials(username)}</span>
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar;
