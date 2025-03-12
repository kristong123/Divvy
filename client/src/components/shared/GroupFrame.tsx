import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import React from "react";
import { getFirebaseStorageUrl } from "../../services/imageUploadService";

// Utility function to validate image URLs or paths
const isValidImageSource = (source: string | null): boolean => {
  if (!source) return false;

  // If it's a URL, validate it
  if (source.startsWith("http")) {
    // Log the URL for debugging
    console.log(`Validating group image URL: ${source}`);

    // Check for common valid patterns
    const validPatterns = [
      /^https:\/\/storage\.googleapis\.com\//,
      /^https:\/\/.*\.firebasestorage\.app\//,
      /^https:\/\/firebasestorage\.googleapis\.com\//,
    ];

    const isValid = validPatterns.some((pattern) => pattern.test(source));
    console.log(`Group URL validation result: ${isValid}`);
    return isValid;
  }

  // If it's a file path, it should be valid
  // Log the path for debugging
  console.log(`Validating group image path: ${source}`);
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

interface GroupFrameProps {
  groupId: string;
  size?: number;
  className?: string;
}

const GroupFrame: React.FC<GroupFrameProps> = ({
  groupId,
  size = 32,
  className = "",
}) => {
  // Get group data from Redux store
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);

  const groupName = group?.name || "Group";
  // Use imageUrl property as defined in the Group interface
  const imageSource = group?.imageUrl || null;

  // Convert the source to a full URL if it's a path
  const imageUrl = React.useMemo(() => {
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
          console.log(`Group image failed to load: ${urlWithTimestamp}`);
          // Store in session storage to prevent repeated errors
          const errorKey = `group_error_${groupId}`;
          if (!sessionStorage.getItem(errorKey)) {
            sessionStorage.setItem(errorKey, "true");
          }
        }
      });
    } else {
      setIsImageValid(false);
    }
  }, [imageUrl, imageSource, groupId]);

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    // Prevent the default error behavior
    e.preventDefault();

    // Set a blank image instead
    e.currentTarget.src = "";

    // Use a session-based approach to prevent repeated notifications
    const errorKey = `group_error_${groupId}`;
    if (!sessionStorage.getItem(errorKey)) {
      // Only show the error once per session for this group
      toast.error(`Failed to load ${groupName}'s image`, {
        id: `group-error-${groupId}`, // Use a unique ID to prevent duplicates
        duration: 3000, // Show for 3 seconds only
      });
      // Mark this error as shown in this session
      sessionStorage.setItem(errorKey, "true");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "G";
    const parts = name.split(" ");
    return parts.map((part) => part.charAt(0)).join("");
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl shadow-md overflow-hidden bg-gradient-to-br from-[#57E3DC] to-[#4DC8C2] ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      data-groupid={groupId}
    >
      {imageUrl && isValidImageSource(imageSource) && isImageValid ? (
        <img
          key={imageUrl}
          src={
            imageUrl.includes("?")
              ? imageUrl.split("?")[0] + "?t=" + Date.now()
              : imageUrl + "?t=" + Date.now()
          }
          alt={groupName}
          className="absolute inset-0 m-auto w-[90%] h-[90%] object-cover rounded-2xl"
          onError={handleImageError}
        />
      ) : (
        <div className="flex items-center rounded-2xl justify-center w-[90%] h-[90%] bg-slate-300">
          <span className="text-white">{getInitials(groupName)}</span>
        </div>
      )}
    </div>
  );
};

export default GroupFrame;
