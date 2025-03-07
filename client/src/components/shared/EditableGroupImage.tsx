import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import GroupFrame from "./GroupFrame";
import ImageUploader from "./ImageUploader";
import { uploadGroupImage } from "../../services/imageUploadService";
import clsx from "clsx";
import { toast } from "react-hot-toast";

interface EditableGroupImageProps {
  groupId: string;
  size?: number;
}

const EditableGroupImage: React.FC<EditableGroupImageProps> = ({
  groupId,
  size = 32,
}) => {
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);
  const currentUser = useSelector((state: RootState) => state.user.username);

  // Log group information for debugging
  useEffect(() => {
    if (!group) {
      console.log(`Group ${groupId} not found in Redux store`);
      return;
    }

    if (!currentUser) {
      console.log(`Current user not found in Redux store`);
      return;
    }

    console.log(`Checking if user ${currentUser} is in group ${groupId}`);
    console.log(`Group users:`, JSON.stringify(group.users));
  }, [group, currentUser, groupId]);

  const handleFileSelect = async (file: File) => {
    if (!currentUser || !groupId) {
      toast.error("Missing user or group information");
      return;
    }

    try {
      console.log(
        `Uploading image for group ${groupId} by user ${currentUser}`
      );
      await uploadGroupImage(file, groupId, currentUser);
    } catch (error: any) {
      console.error("Failed to upload group image:", error);
    }
  };

  // Custom overlay for rounded-2xl instead of rounded-full
  const overlayClassName = clsx(
    // Position
    "absolute inset-0",
    // Layout
    "flex items-center justify-center",
    // Appearance
    "bg-black bg-opacity-50 rounded-2xl",
    // Visibility
    "opacity-0 group-hover:opacity-100",
    // Transitions
    "transition-opacity"
  );

  // Always render the editable version for now to debug
  return (
    <ImageUploader
      onFileSelect={handleFileSelect}
      overlayClassName={overlayClassName}
    >
      <GroupFrame groupId={groupId} size={size} />
    </ImageUploader>
  );
};

export default EditableGroupImage;
