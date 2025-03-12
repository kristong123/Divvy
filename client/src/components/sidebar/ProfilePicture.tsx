import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import ProfileFrame from "../shared/ProfileFrame";
import ImageUploader from "../shared/ImageUploader";
import { uploadProfilePicture } from "../../services/imageUploadService";

const ProfilePicture: React.FC = () => {
  const { username } = useSelector((state: RootState) => state.user);

  const handleFileSelect = async (file: File) => {
    if (!username) return;
    try {
      await uploadProfilePicture(file, username);
    } catch (error: unknown) {
      // Error is already handled in the uploadProfilePicture function
      // Just log it here for debugging purposes
      console.error("Failed to upload profile picture:", error);
      // Don't show another toast here as it's already shown in the service
    }
  };

  return (
    <ImageUploader onFileSelect={handleFileSelect}>
      <ProfileFrame username={username} size={70} />
    </ImageUploader>
  );
};

export default ProfilePicture;
