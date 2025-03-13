import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import React, { useState, useEffect } from "react";
import { getImageUrl } from "../../services/imageUploadService";
import { cacheGroupImage } from "../../store/slice/groupSlice";
import { Users } from "lucide-react";

// Function to check if the image source is valid
const isValidImageSource = (source: string): boolean => {
  // Check for Cloudinary URLs only (no placeholders)
  if (source && typeof source === "string") {
    if (source.startsWith("http")) {
      return source.match(/^https:\/\/res\.cloudinary\.com\//) !== null;
    }
    return true;
  }
  return false;
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
  const dispatch = useDispatch();

  // Get group data from Redux store
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);

  // Get cached group image from groups slice
  const cachedGroupImages = useSelector(
    (state: RootState) => state.groups.groupImageCache
  );
  const cachedImage = cachedGroupImages[groupId];

  const groupName = group?.name || "Group";
  // Use imageUrl property as defined in the Group interface
  const imageSource = group?.imageUrl || null;

  // State for the actual download URL
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [hasValidImage, setHasValidImage] = useState<boolean>(false);

  // Function to load the image
  const loadImage = async () => {
    try {
      // Check if we already have this image in the cache and it's not too old
      if (cachedImage && cachedImage.isValid) {
        const cacheAge = Date.now() - cachedImage.lastUpdated;
        // Use cache if it's less than 30 minutes old
        if (cacheAge < 30 * 60 * 1000) {
          console.log(`[GroupFrame] Using cached image for ${groupId}`);
          setImageSrc(cachedImage.downloadUrl);
          setHasValidImage(true);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);

      // Get the group image URL
      let imageUrl = imageSource;

      console.log(
        `[GroupFrame] Loading image for ${groupId}, source:`,
        imageUrl
      );

      // If we have a valid URL, use it directly
      if (imageUrl && isValidImageSource(imageUrl)) {
        console.log(
          `[GroupFrame] Valid image source for ${groupId}:`,
          imageUrl
        );

        // Use the URL directly (with possible timestamp for cache busting)
        const directUrl = getImageUrl(imageUrl);
        console.log(`[GroupFrame] Using direct URL for ${groupId}:`, directUrl);

        setImageSrc(directUrl);
        setHasValidImage(true);

        // Cache the group image URL
        dispatch(
          cacheGroupImage({
            groupId,
            imageSource: imageUrl,
            downloadUrl: directUrl,
            isValid: true,
            useProxy: false,
          })
        );
      } else {
        console.log(
          `[GroupFrame] Invalid or missing image source for ${groupId}, using Users icon`
        );
        // No valid image, we'll use the Users icon
        setHasValidImage(false);
      }
    } catch (error) {
      console.error(
        `[GroupFrame] Error loading group image for ${groupId}:`,
        error
      );
      setHasValidImage(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    // If image fails to load, use Users icon
    console.log(
      `[GroupFrame] Image failed to load for ${groupId}, using Users icon`
    );

    // Log the image source that failed
    console.log(`[GroupFrame] Failed image source: ${imageSrc}`);

    // Mark as invalid
    setHasValidImage(false);

    // Update the cache to mark this image as invalid
    if (imageSource) {
      dispatch(
        cacheGroupImage({
          groupId,
          imageSource,
          downloadUrl: "",
          isValid: false,
          useProxy: false,
        })
      );
    }
  };

  useEffect(() => {
    loadImage();
  }, [imageSource, groupId, dispatch]);

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl shadow-md overflow-hidden bg-gradient-to-br from-[#57E3DC] to-[#4DC8C2] ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      data-group-id={groupId}
    >
      {hasValidImage && !isLoading ? (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={groupName}
          className="absolute inset-0 m-auto w-[90%] h-[90%] object-cover rounded-2xl"
          onError={handleImageError}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center rounded-2xl justify-center w-[90%] h-[90%] bg-slate-300">
          <Users className="text-white" size={size * 0.6} />
        </div>
      )}
    </div>
  );
};

export default GroupFrame;
