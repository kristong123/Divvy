import React, { useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import clsx from "clsx";
import { RootState } from "../../store/store";
import {
  updateProfilePicture,
  forceProfileRefresh,
} from "../../store/slice/userSlice";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { toast } from "react-hot-toast";
import ProfileAvatar from "../shared/ProfileAvatar";
import { updateProfilePictureSocket } from "../../services/socketService";

const ProfilePicture: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username } = useSelector((state: RootState) => state.user);

  const container = clsx(
    // Layout
    "relative",
    // Size
    "w-fit",
    // Interactive
    "cursor-pointer"
  );

  const overlay = clsx(
    // Position
    "absolute inset-0",
    // Layout
    "flex items-center justify-center",
    // Appearance
    "bg-black bg-opacity-50 rounded-full",
    // Visibility
    "opacity-0 group-hover:opacity-100",
    // Transitions
    "transition-opacity"
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading("Uploading profile picture...");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("username", username || "");

      const response = await axios.post(
        `${BASE_URL}/api/user/profile-picture`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const imageUrlWithTimestamp = response.data.url.includes("?")
        ? response.data.url
        : response.data.url + "?t=" + Date.now();

      dispatch(
        updateProfilePicture({
          username: username || "",
          imageUrl: imageUrlWithTimestamp,
        })
      );

      dispatch(forceProfileRefresh());

      updateProfilePictureSocket(username || "", imageUrlWithTimestamp);

      const avatarElements = document.querySelectorAll(
        `[data-username="${username}"]`
      );
      avatarElements.forEach((el) => {
        const img = el.querySelector("img");
        if (img) {
          const currentSrc = img.src;
          img.src = currentSrc.includes("?")
            ? currentSrc.split("?")[0] + "?t=" + Date.now()
            : currentSrc + "?t=" + Date.now();
        }
      });

      toast.success("Profile picture updated!", {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image", {
        id: loadingToast,
      });
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={container} onClick={handleClick}>
      <div className="group">
        <ProfileAvatar username={username} size={70} />
        <div className={overlay}>
          <span className="text-white text-xs">Edit</span>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default ProfilePicture;
