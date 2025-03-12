import axios from "axios";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config/api";
import { updateProfilePictureSocket, sendMessage } from "./socketService";
import { store } from "../store/store";
import * as groupActions from "../store/slice/groupSlice";
import { updateProfilePicture, forceProfileRefresh } from "../store/slice/userSlice";
import { GroupMember } from "../types/groupTypes";
import {ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from "../config/firebase";
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

    // Clean the URL to ensure it doesn't have existing timestamps
    const cleanImageUrl = response.data.url.includes("?")
      ? response.data.url.split("?")[0]
      : response.data.url;
    
    // Add a single timestamp
    const imageUrlWithTimestamp = cleanImageUrl + "?t=" + Date.now();

    // Update Redux store
    store.dispatch(
      updateProfilePicture({
        username: username,
        imageUrl: imageUrlWithTimestamp,
      })
    );

    store.dispatch(forceProfileRefresh());

    // Notify other users via socket
    updateProfilePictureSocket(username, imageUrlWithTimestamp);

    // Force refresh of all avatar elements with this username
    const avatarElements = document.querySelectorAll(
      `[data-username="${username}"]`
    );
    avatarElements.forEach((el) => {
      const img = el.querySelector("img");
      if (img) {
        // Always use the clean URL with a new timestamp
        img.src = cleanImageUrl + "?t=" + Date.now();
      }
    });

    toast.success("Profile picture updated!", {
      id: loadingToast,
    });

    return imageUrlWithTimestamp;
  } catch (error) {
    console.error("Upload error:", error);
    toast.error("Failed to upload image", {
      id: loadingToast,
    });
    throw error;
  }
};

/**
 * Upload a group image
 * @param file The image file to upload
 * @param groupId The ID of the group
 * @param currentUser The username of the current user (for admin verification)
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

    console.log(`Uploading image for group ${groupId} by user ${currentUser}`);

    // Create form data
    const formData = new FormData();
    formData.append("image", file);
    formData.append("groupId", groupId);
    formData.append("username", currentUser);

    // Make the API request
    const response = await axios.post(
      `${BASE_URL}/api/groups/${groupId}/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // Process the response
    if (!response.data || !response.data.url) {
      toast.error("Invalid response from server", {
        id: loadingToast,
      });
      throw new Error("Invalid response from server");
    }

    // Add a timestamp to force cache refresh
    const timestamp = Date.now();
    const imageUrl = response.data.url;
    const imageUrlWithTimestamp = imageUrl.includes("?")
      ? imageUrl.split("?")[0] + "?t=" + timestamp
      : imageUrl + "?t=" + timestamp;

    // Get current group data from Redux store
    const state = store.getState();
    const group = state.groups.groups[groupId];
    
    if (!group) {
      console.error("Group not found in store:", groupId);
      toast.error("Group not found in store", {
        id: loadingToast,
      });
      throw new Error("Group not found in store");
    }

    // Update the group image in Redux immediately
    store.dispatch(
      groupActions.updateGroup({
        id: groupId,
        imageUrl: imageUrlWithTimestamp,
      })
    );

    // Force a re-render of the groups list
    const updatedGroups = {
      ...state.groups.groups,
    };
    store.dispatch(groupActions.setGroups(Object.values(updatedGroups)));

    // Add a system message about the image update
    sendMessage(
      {
        chatId: `group_${groupId}`,
        content: `${currentUser} updated the group image`,
        senderId: "system",
        type: "text"
      },
      {
        dispatch: store.dispatch
      }
    );

    // Force refresh all DOM images with this group ID
    forceRefreshGroupImages(groupId, imageUrlWithTimestamp);

    // Emit socket event to notify other users
    const socket = (window as any).socket;
    if (socket) {
      socket.emit("broadcast-group-update", {
        groupId,
        imageUrl: imageUrlWithTimestamp,
        updatedBy: currentUser,
        members: group?.users.map((user: GroupMember) => user.username) || [],
      });
    }

    toast.success("Group image updated!", {
      id: loadingToast,
    });

    return imageUrlWithTimestamp;
  } catch (error: unknown) {
    toast.error(
      error instanceof Error 
        ? `Error updating group image: ${error.message}` 
        : "Error updating group image"
    );
    throw error;
  }
};

/**
 * Helper function to force refresh all DOM images for a specific group
 */
export const forceRefreshGroupImages = (groupId: string, imageUrl: string) => {
  console.log(`forceRefreshGroupImages called for group ${groupId} with URL ${imageUrl}`);
  
  // Clean the URL to ensure it doesn't have existing timestamps
  const cleanImageUrl = imageUrl.includes("?")
    ? imageUrl.split("?")[0]
    : imageUrl;
  
  // Simple approach: update immediately and then try again after a delay
  const updateAllGroupImages = () => {
    const groupElements = document.querySelectorAll(`[data-groupid="${groupId}"]`);
    console.log(`Found ${groupElements.length} elements with groupId ${groupId} to update`);
    
    groupElements.forEach((el) => {
      const img = el.querySelector("img");
      if (img) {
        // Always use the clean URL with a new timestamp
        const newUrl = cleanImageUrl + "?t=" + Date.now();
        console.log(`Updating image src to ${newUrl}`);
        img.src = newUrl;
      }
    });
  };
  // Try immediately
  updateAllGroupImages();
  
  // Try again after a short delay
  setTimeout(updateAllGroupImages, 100);
  
  // And again after a longer delay
  setTimeout(updateAllGroupImages, 500);
}; 

/**
 * Uploads a file to Firebase Storage and returns the download URL
 * @param file The file to upload
 * @returns Promise with the download URL
 */
export const uploadFile = async (file: File): Promise<string> => {
    console.log("uploading file");
    const date = new Date();
    const storageRef = ref(storage, `image/${date.getTime()}_${file.name}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    console.log("file in firebase")
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                // You can handle progress updates here if needed
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                // Handle unsuccessful uploads
                console.error('Upload error:', error);
                reject("Failed to upload file");
            },
            async () => {
                try {
                    // Get the download URL after successful upload
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    console.error('Error getting download URL:', error);
                    reject("Failed to get download URL");
                }
            }
        );
    });
};