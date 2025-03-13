import axios from "axios";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config/api";
import {
  updateProfilePictureSocket,
  updateGroupImageSocket,
} from "./socketService";
import { store } from "../store/store";
import * as groupActions from "../store/slice/groupSlice";
import {
  updateProfilePicture,
  forceProfileRefresh,
} from "../store/slice/userSlice";
import {
  clearProfilePictureCache,
  cacheProfilePicture,
} from "../store/slice/friendsSlice";
import { clearGroupImageCache } from "../store/slice/groupSlice";
import { updateFriendProfilePicture } from "../store/slice/friendsSlice";

/**
 * Gets the image URL with cache-busting parameters if needed
 * @param url The original image URL
 * @returns The URL with cache-busting parameters if needed
 */
export const getImageUrl = (url: string): string => {
  if (!url) {
    console.log("[getImageUrl] Empty URL provided");
    return "";
  }

  // Add a timestamp to prevent caching issues for Cloudinary URLs
  if (url.includes("cloudinary.com") && !url.includes("?")) {
    const timestamp = Math.floor(Date.now() / (30 * 60 * 1000));
    console.log("[getImageUrl] Adding timestamp to Cloudinary URL");
    return `${url}?t=${timestamp}`;
  }

  console.log("[getImageUrl] Returning URL as is:", url);
  return url;
};

/**
 * Upload a profile picture for a user
 * @param file The image file to upload
 * @param username The username of the user
 * @returns Promise with the new image URL
 */
export const uploadProfilePicture = async (
  file: File,
  username: string
): Promise<string> => {
  const loadingToast = toast.loading("Uploading profile picture...");

  try {
    // Validate inputs
    if (!file || !username) {
      toast.error("Missing required information for upload", {
        id: loadingToast,
      });
      throw new Error("Missing required information for upload");
    }

    console.log(
      `[uploadProfilePicture] Uploading profile picture for ${username}`
    );

    const formData = new FormData();
    formData.append("image", file);
    formData.append("username", username);

    const response = await axios.post(
      `${BASE_URL}/api/user/profile-picture`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log(`[uploadProfilePicture] Server response:`, response.data);

    // Get the image URL from the response
    const imageUrl = response.data.path;
    console.log(`[uploadProfilePicture] Image URL from server:`, imageUrl);

    // Add a timestamp to prevent caching issues
    const imageUrlWithTimestamp = imageUrl.includes("?")
      ? imageUrl + "&t=" + Date.now()
      : imageUrl + "?t=" + Date.now();

    console.log(
      `[uploadProfilePicture] Image URL with timestamp:`,
      imageUrlWithTimestamp
    );

    // Clear the profile picture cache for this user
    store.dispatch(clearProfilePictureCache(username));

    // Update Redux store
    console.log(
      `[uploadProfilePicture] Updating Redux store with new profile picture`
    );

    // 1. Update in the user slice
    store.dispatch(
      updateProfilePicture({
        username: username,
        imageUrl: imageUrlWithTimestamp,
        profilePicturePath: imageUrl,
      })
    );

    // 2. Update in the friends slice
    store.dispatch(
      updateFriendProfilePicture({
        username: username,
        profilePicture: imageUrlWithTimestamp,
      })
    );

    // 3. Update in all groups
    store.dispatch(
      groupActions.updateAllUserProfilePictures({
        username: username,
        profilePicture: imageUrlWithTimestamp,
      })
    );

    store.dispatch(forceProfileRefresh());

    // Notify other users via socket
    console.log(`[uploadProfilePicture] Notifying other users via socket`);
    updateProfilePictureSocket(username, imageUrlWithTimestamp);

    // Force refresh of all avatar elements with this username
    console.log(
      `[uploadProfilePicture] Refreshing DOM elements with username: ${username}`
    );
    const avatarElements = document.querySelectorAll(
      `[data-username="${username}"]`
    );
    console.log(
      `[uploadProfilePicture] Found ${avatarElements.length} elements to update`
    );

    avatarElements.forEach((el) => {
      const img = el.querySelector("img");
      if (img) {
        console.log(
          `[uploadProfilePicture] Updating image src from ${img.src} to ${imageUrlWithTimestamp}`
        );
        // Use the already constructed URL with timestamp
        img.src = imageUrlWithTimestamp;
      }
    });

    toast.success("Profile picture updated!", {
      id: loadingToast,
    });

    return imageUrlWithTimestamp;
  } catch (error: unknown) {
    console.error("[uploadProfilePicture] Upload error:", error);

    // Ensure we only show one error toast
    toast.error(
      error instanceof Error
        ? `Failed to upload image: ${error.message}`
        : "Failed to upload image",
      {
        id: loadingToast,
      }
    );

    throw error;
  }
};

/**
 * Upload a group image
 * @param file The image file to upload
 * @param groupId The ID of the group
 * @param currentUser The username of the current user
 * @returns Promise with the new image URL
 */
export const uploadGroupImage = async (
  file: File,
  groupId: string,
  currentUser: string
): Promise<string> => {
  const loadingToast = toast.loading("Uploading group image...");

  try {
    // Validate inputs
    if (!file || !groupId || !currentUser) {
      toast.error("Missing required information for upload", {
        id: loadingToast,
      });
      throw new Error("Missing required information for upload");
    }

    console.log(`[uploadGroupImage] Uploading group image for ${groupId}`);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("username", currentUser);

    const response = await axios.post(
      `${BASE_URL}/api/groups/${groupId}/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log(`[uploadGroupImage] Server response:`, response.data);

    // Get the image URL from the response
    const imageUrl = response.data.path;
    console.log(`[uploadGroupImage] Image URL from server:`, imageUrl);

    // Add a timestamp to prevent caching issues
    const imageUrlWithTimestamp = imageUrl.includes("?")
      ? imageUrl + "&t=" + Date.now()
      : imageUrl + "?t=" + Date.now();

    console.log(
      `[uploadGroupImage] Image URL with timestamp:`,
      imageUrlWithTimestamp
    );

    // Clear the group image cache
    store.dispatch(clearGroupImageCache(groupId));

    // Update Redux store with the new image URL
    console.log(`[uploadGroupImage] Updating Redux store with new group image`);
    store.dispatch(
      groupActions.updateGroup({
        id: groupId,
        imageUrl: imageUrlWithTimestamp,
      })
    );

    // Notify other users via socket
    console.log(`[uploadGroupImage] Notifying other users via socket`);
    updateGroupImageSocket(groupId, imageUrlWithTimestamp, currentUser);

    // Force refresh of all group avatar elements with this group ID
    console.log(
      `[uploadGroupImage] Refreshing all group images for ${groupId}`
    );
    forceRefreshGroupImages(groupId, imageUrlWithTimestamp);

    toast.success("Group image updated!", {
      id: loadingToast,
    });

    return imageUrlWithTimestamp;
  } catch (error: unknown) {
    console.error("[uploadGroupImage] Upload error:", error);

    // Ensure we only show one error toast
    toast.error(
      error instanceof Error
        ? `Failed to upload image: ${error.message}`
        : "Failed to upload image",
      {
        id: loadingToast,
      }
    );

    throw error;
  }
};

/**
 * Force refresh of all group avatar elements with the given group ID
 */
export const forceRefreshGroupImages = (groupId: string, imageUrl: string) => {
  console.log(
    `[forceRefreshGroupImages] Refreshing all images for group ${groupId}`
  );

  // Force refresh of all group avatar elements with this group ID
  const groupElements = document.querySelectorAll(
    `[data-group-id="${groupId}"]`
  );

  console.log(
    `[forceRefreshGroupImages] Found ${groupElements.length} elements to update`
  );

  const updateAllGroupImages = () => {
    groupElements.forEach((el) => {
      const img = el.querySelector("img");
      if (img) {
        console.log(
          `[forceRefreshGroupImages] Updating image src from ${img.src} to ${imageUrl}`
        );
        img.src = imageUrl;
      }
    });
  };

  // Update immediately and then again after a short delay
  // This helps ensure the update happens even if elements are being re-rendered
  updateAllGroupImages();
  setTimeout(updateAllGroupImages, 100);
  setTimeout(updateAllGroupImages, 500);
  setTimeout(updateAllGroupImages, 1000);
};

/**
 * Upload a file and return the URL
 * @param file The file to upload
 * @returns Promise with the file URL
 */
export const uploadFile = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post(`${BASE_URL}/api/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Add this function to preload profile pictures for all friends and group members
export const preloadProfilePictures = (): void => {
  const state = store.getState();
  const friends = state.friends.friends;
  const groups = state.groups.groups;
  const currentUser = state.user;
  const cachedPictures = state.friends.profilePictureCache;

  console.log(`[preloadProfilePictures] Starting preload of profile pictures`);

  // Set to track usernames we've already processed
  const processedUsernames = new Set<string>();

  // Preload current user's profile picture
  if (currentUser.username && currentUser.profilePicture) {
    const username = currentUser.username;
    if (!processedUsernames.has(username)) {
      processedUsernames.add(username);
      preloadSingleProfilePicture(
        username,
        currentUser.profilePicture,
        cachedPictures
      );
    }
  }

  // Preload friends' profile pictures
  if (Array.isArray(friends)) {
    friends.forEach((friend) => {
      if (
        friend.username &&
        friend.profilePicture &&
        !processedUsernames.has(friend.username)
      ) {
        processedUsernames.add(friend.username);
        preloadSingleProfilePicture(
          friend.username,
          friend.profilePicture,
          cachedPictures
        );
      }
    });
  }

  // Preload group members' profile pictures
  if (groups) {
    Object.values(groups).forEach((group) => {
      if (group && Array.isArray(group.users)) {
        group.users.forEach((user) => {
          if (
            user &&
            user.username &&
            user.profilePicture &&
            !processedUsernames.has(user.username)
          ) {
            processedUsernames.add(user.username);
            preloadSingleProfilePicture(
              user.username,
              user.profilePicture,
              cachedPictures
            );
          }
        });
      }
    });
  }

  console.log(
    `[preloadProfilePictures] Preloaded ${processedUsernames.size} profile pictures`
  );
};

// Helper function to preload a single profile picture
const preloadSingleProfilePicture = (
  username: string,
  imageUrl: string | null,
  cachedPictures: Record<string, any>
): void => {
  if (!imageUrl) return;

  // Check if we already have a valid cached version
  if (cachedPictures[username]) {
    const cacheAge = Date.now() - cachedPictures[username].lastUpdated;
    // If cache is less than 30 minutes old, skip preloading
    if (cacheAge < 30 * 60 * 1000) {
      console.log(
        `[preloadProfilePictures] Using cached image for ${username}`
      );
      return;
    }
  }

  // Use the direct URL (with possible timestamp for cache busting)
  const directUrl = getImageUrl(imageUrl);

  // Preload the image
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";

  img.onload = () => {
    console.log(
      `[preloadProfilePictures] Successfully preloaded image for ${username}`
    );
    // Cache the profile picture
    store.dispatch(
      cacheProfilePicture({
        username,
        imageSource: imageUrl,
        downloadUrl: directUrl,
        isValid: true,
        useProxy: false,
      })
    );
  };

  img.onerror = () => {
    console.error(
      `[preloadProfilePictures] Failed to preload image for ${username}`
    );
  };

  img.src = directUrl;
};

/**
 * Force refresh of all profile pictures for a specific user
 * @param username The username of the user
 * @param imageUrl The new image URL
 */
export const forceRefreshProfilePictures = (
  username: string,
  imageUrl: string
): void => {
  console.log(
    `[forceRefreshProfilePictures] Refreshing all profile pictures for ${username}`
  );

  // Force refresh of all avatar elements with this username
  const avatarElements = document.querySelectorAll(
    `[data-username="${username}"]`
  );

  console.log(
    `[forceRefreshProfilePictures] Found ${avatarElements.length} elements to update`
  );

  const updateAllProfileImages = () => {
    avatarElements.forEach((el) => {
      const img = el.querySelector("img");
      if (img) {
        console.log(
          `[forceRefreshProfilePictures] Updating image src from ${img.src} to ${imageUrl}`
        );
        img.src = imageUrl;
      }
    });
  };

  // Update immediately and then again after a short delay
  // This helps ensure the update happens even if elements are being re-rendered
  updateAllProfileImages();
  setTimeout(updateAllProfileImages, 100);
  setTimeout(updateAllProfileImages, 500);
  setTimeout(updateAllProfileImages, 1000);
};
