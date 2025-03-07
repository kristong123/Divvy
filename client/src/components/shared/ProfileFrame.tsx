import React, { useMemo } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface ProfileFrameProps {
  username: string;
  size?: number; // Use numeric size instead of preset sizes
}

const ProfileFrame: React.FC<ProfileFrameProps> = ({
  username,
  size = 32, // Default size of 32px
}) => {
  // Get data from Redux store
  const groups = useSelector((state: RootState) => state.groups.groups);
  const friends = useSelector((state: RootState) => state.friends.friends);
  const currentUser = useSelector((state: RootState) => state.user);

  // Find profile picture based on username
  const imageUrl = useMemo(() => {
    // First check if this is the current user
    if (username === currentUser?.username && currentUser?.profilePicture) {
      return currentUser.profilePicture;
    }

    // Check in groups first
    if (groups) {
      for (const groupId in groups) {
        const group = groups[groupId];
        if (group && Array.isArray(group.users)) {
          const user = group.users.find((u) => u && u.username === username);
          if (user?.profilePicture) {
            return user.profilePicture;
          }
        }
      }
    }

    // Then check in friends list
    if (Array.isArray(friends)) {
      const friend = friends.find((f) => f && f.username === username);
      if (friend?.profilePicture) {
        return friend.profilePicture;
      }
    }

    return null;
  }, [username, groups, friends, currentUser]);

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    e.currentTarget.src = "";
    toast.error(`Failed to load ${username}'s profile picture`);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.map((part) => part.charAt(0)).join("");
  };

  return (
    <div
      className="relative flex items-center justify-center rounded-full shadow-md overflow-hidden bg-gradient-to-br from-dark2 to-light1"
      style={{ width: `${size}px`, height: `${size}px` }}
      data-username={username}
    >
      {imageUrl ? (
        <img
          key={imageUrl}
          src={
            imageUrl.includes("?")
              ? imageUrl.split("?")[0] + "?t=" + Date.now()
              : imageUrl + "?t=" + Date.now()
          }
          alt={username}
          className="absolute inset-0 m-auto w-[90%] h-[90%] object-cover rounded-full"
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

export default ProfileFrame;
