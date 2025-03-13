import React, { useMemo, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { getImageUrl } from "../../services/imageUploadService";
import { cacheProfilePicture } from "../../store/slice/friendsSlice";
import { UserRound } from "lucide-react";

// Utility function to validate image URLs or paths
const isValidImageSource = (source: string | null): boolean => {
  if (!source) return false;

  // If it's a URL, validate it
  if (source.startsWith("http")) {
    // Check for Cloudinary URLs only (no placeholders)
    return source.match(/^https:\/\/res\.cloudinary\.com\//) !== null;
  }

  // If it's a file path, it should be valid
  return true;
};

interface ProfileFrameProps {
  username: string;
  size?: number;
  className?: string;
}

const ProfileFrame: React.FC<ProfileFrameProps> = ({
  username,
  size = 32,
  className,
}) => {
  const dispatch = useDispatch();

  // Get data from Redux store
  const groups = useSelector((state: RootState) => state.groups.groups);
  const friends = useSelector((state: RootState) => state.friends.friends);
  const currentUser = useSelector((state: RootState) => state.user);

  // Get cached profile picture from friends slice
  const cachedProfilePictures = useSelector(
    (state: RootState) => state.friends.profilePictureCache
  );
  const cachedPicture = cachedProfilePictures[username];

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

  // State for the actual download URL
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [hasValidImage, setHasValidImage] = useState<boolean>(false);

  // Function to load the image
  const loadImage = async () => {
    try {
      // Check if we already have this image in the cache and it's not too old
      if (cachedPicture && cachedPicture.isValid) {
        const cacheAge = Date.now() - cachedPicture.lastUpdated;
        // Use cache if it's less than 30 minutes old
        if (cacheAge < 30 * 60 * 1000) {
          console.log(`[ProfileFrame] Using cached image for ${username}`);
          setImageSrc(cachedPicture.downloadUrl);
          setHasValidImage(true);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);

      // Get the profile picture URL from the user data
      let imageUrl = imageSource;

      console.log(
        `[ProfileFrame] Loading image for ${username}, source:`,
        imageUrl
      );

      // If we have a valid URL, use it directly
      if (imageUrl && isValidImageSource(imageUrl)) {
        console.log(
          `[ProfileFrame] Valid image source for ${username}:`,
          imageUrl
        );

        // Use the URL directly (with possible timestamp for cache busting)
        const directUrl = getImageUrl(imageUrl);
        console.log(
          `[ProfileFrame] Using direct URL for ${username}:`,
          directUrl
        );

        setImageSrc(directUrl);
        setHasValidImage(true);

        // Cache the profile picture URL
        dispatch(
          cacheProfilePicture({
            username,
            imageSource: imageUrl,
            downloadUrl: directUrl,
            isValid: true,
            useProxy: false,
          })
        );
      } else {
        console.log(
          `[ProfileFrame] Invalid or missing image source for ${username}, using UserRound icon`
        );
        // No valid image, we'll use the UserRound icon
        setHasValidImage(false);
      }
    } catch (error) {
      console.error(
        `[ProfileFrame] Error loading profile picture for ${username}:`,
        error
      );
      setHasValidImage(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    // If image fails to load, use UserRound icon
    console.log(
      `[ProfileFrame] Image failed to load for ${username}, using UserRound icon`
    );

    // Log the image source that failed
    console.log(`[ProfileFrame] Failed image source: ${imageSrc}`);

    // Mark as invalid
    setHasValidImage(false);

    // Update the cache to mark this image as invalid
    if (imageSource) {
      dispatch(
        cacheProfilePicture({
          username,
          imageSource,
          downloadUrl: "",
          isValid: false,
          useProxy: false,
        })
      );
    }
  };

  // Add useEffect to load the image when the component mounts or when the image source changes
  useEffect(() => {
    console.log(`[ProfileFrame] Component mounted/updated for ${username}`);
    console.log(`[ProfileFrame] Current imageSource:`, imageSource);
    console.log(`[ProfileFrame] Current cachedPicture:`, cachedPicture);
    loadImage();
  }, [imageSource, username, dispatch]);

  return (
    <div
      className={`relative flex items-center justify-center rounded-full shadow-md overflow-hidden bg-gradient-to-br from-dark2 to-light1 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      data-username={username}
    >
      {hasValidImage && !isLoading ? (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={username}
          className="absolute inset-0 m-auto w-[90%] h-[90%] object-cover rounded-full"
          onError={(e) => {
            console.log(`[ProfileFrame] Image error for ${username}:`, e);
            handleImageError();
          }}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center rounded-full justify-center w-[90%] h-[90%] bg-slate-300">
          <UserRound className="text-white" size={size * 0.6} />
        </div>
      )}
    </div>
  );
};

export default ProfileFrame;
