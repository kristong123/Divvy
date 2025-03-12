import React, { useMemo } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { getFirebaseStorageUrl } from "../../services/imageUploadService";

// Utility function to validate image URLs or paths
const isValidImageSource = (source: string | null): boolean => {
  if (!source) return false;

  // If it's a URL, validate it
  if (source.startsWith("http")) {
    // Log the URL for debugging
    console.log(`Validating image URL: ${source}`);

    // Check for common valid patterns
    const validPatterns = [
      /^https:\/\/storage\.googleapis\.com\//,
      /^https:\/\/.*\.firebasestorage\.app\//,
      /^https:\/\/firebasestorage\.googleapis\.com\//,
    ];

    const isValid = validPatterns.some((pattern) => pattern.test(source));
    console.log(`URL validation result: ${isValid}`);
    return isValid;
  }

  // If it's a file path, it should be valid
  // Log the path for debugging
  console.log(`Validating image path: ${source}`);
  return true;
};

// Function to get the full URL from a path or URL
const getFullImageUrl = (source: string | null): string | null => {
  if (!source) return null;

  // If it's already a URL, return it
  if (source.startsWith("http")) {
    return source;
  }

  // Otherwise, convert the path to a URL
  return getFirebaseStorageUrl(source);
};

interface ProfileFrameProps {
  username: string;
  size?: number; // Use numeric size instead of preset sizes
  className?: string;
}

const ProfileFrame: React.FC<ProfileFrameProps> = ({
  username,
  size = 32, // Default size of 32px
  className,
}) => {
  // Get data from Redux store
  const groups = useSelector((state: RootState) => state.groups.groups);
  const friends = useSelector((state: RootState) => state.friends.friends);
  const currentUser = useSelector((state: RootState) => state.user);

  // Find profile picture based on username
  const imageSource = useMemo(() => {
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

  // Convert the source to a full URL if it's a path
  const imageUrl = useMemo(() => {
    return getFullImageUrl(imageSource);
  }, [imageSource]);

  // Add a function to preload the image to check if it's valid
  const checkImageValidity = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  // Use React.useEffect to check image validity
  const [isImageValid, setIsImageValid] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (imageUrl && isValidImageSource(imageSource)) {
      // Add a timestamp to prevent caching
      const urlWithTimestamp = imageUrl.includes("?")
        ? imageUrl.split("?")[0] + "?t=" + Date.now()
        : imageUrl + "?t=" + Date.now();

      checkImageValidity(urlWithTimestamp).then((valid) => {
        setIsImageValid(valid);
        if (!valid) {
          console.log(`Image failed to load: ${urlWithTimestamp}`);
          // Store in session storage to prevent repeated errors
          const errorKey = `profile_error_${username}`;
          if (!sessionStorage.getItem(errorKey)) {
            sessionStorage.setItem(errorKey, "true");
          }
        }
      });
    } else {
      setIsImageValid(false);
    }
  }, [imageUrl, imageSource, username]);

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    // Prevent the default error behavior
    e.preventDefault();

    // Set a blank image instead
    e.currentTarget.src = "";

    // Use a session-based approach to prevent repeated notifications
    const errorKey = `profile_error_${username}`;
    if (!sessionStorage.getItem(errorKey)) {
      // Only show the error once per session for this user
      toast.error(`Failed to load ${username}'s profile picture`, {
        id: `profile-error-${username}`, // Use a unique ID to prevent duplicates
        duration: 3000, // Show for 3 seconds only
      });
      // Mark this error as shown in this session
      sessionStorage.setItem(errorKey, "true");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.map((part) => part.charAt(0)).join("");
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-full shadow-md overflow-hidden bg-gradient-to-br from-dark2 to-light1 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      data-username={username}
    >
      {imageUrl && isValidImageSource(imageSource) && isImageValid ? (
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
