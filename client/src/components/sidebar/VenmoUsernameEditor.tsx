import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { toast } from "react-hot-toast";
import { updateVenmoUsername as emitVenmoUpdate } from "../../services/socketService";
import VenmoIcon from "../shared/VenmoIcon";
import ClickInput from "../shared/ClickInput";
import { useTheme } from "../../context/ThemeContext";

const VenmoUsernameEditor: React.FC = () => {
  const { username, venmoUsername, isLoggedIn } = useSelector(
    (state: RootState) => {
      return state.user;
    }
  );
  const [isEditing, setIsEditing] = useState(false);
  const [newVenmoUsername, setNewVenmoUsername] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    if (venmoUsername) {
      setNewVenmoUsername(venmoUsername);
    }
  }, [venmoUsername]);

  if (!isLoggedIn) {
    return null;
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleChange = (value: string) => {
    setNewVenmoUsername(value);
  };

  const handleSave = async () => {
    setIsEditing(false);
    const trimmedUsername = newVenmoUsername.trim();

    if (
      trimmedUsername !== venmoUsername &&
      username &&
      trimmedUsername !== ""
    ) {
      try {
        await emitVenmoUpdate(username, trimmedUsername);
        toast.success("Venmo username updated!");
      } catch (error) {
        console.error("Error updating Venmo username:", error);
        toast.error("Failed to update Venmo username");
        setNewVenmoUsername(venmoUsername || "");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewVenmoUsername(venmoUsername || "");
  };

  return (
    <div className="flex items-center w-fit">
      {isEditing ? (
        <ClickInput
          value={newVenmoUsername}
          onChange={handleChange}
          onSave={handleSave}
          onCancel={handleCancel}
          minWidth={80}
          className={theme === "dark" ? "text-white" : "text-black"}
          placeholder="Venmo username"
          autoFocus
        />
      ) : (
        <span
          onClick={handleEdit}
          className={`cursor-pointer ml-2 ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {venmoUsername ? `@${venmoUsername}` : "Add Venmo"}
        </span>
      )}
      <VenmoIcon className="inline-block ml-1" color="#3D95CE" />
    </div>
  );
};

export default VenmoUsernameEditor;
