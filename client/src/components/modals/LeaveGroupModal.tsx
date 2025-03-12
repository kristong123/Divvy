import React from "react";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Button from "../shared/Button";

interface LeaveGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  groupName?: string;
}

const LeaveGroupModal: React.FC<LeaveGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  groupName,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const message = groupName
    ? `Are you sure you want to leave "${groupName}" permanently?`
    : "Are you sure you want to leave this group chat permanently?";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose} // Close when clicking outside
    >
      <div
        className={clsx(
          // Base styles
          "rounded-lg p-6 w-96 max-w-md",
          "shadow-xl transform transition-all",
          // Animation
          "animate-fadeIn",
          // Theme-specific styles
          theme === "dark"
            ? "bg-gray-800 text-white border border-gray-700"
            : "bg-white text-black border border-gray-200"
        )}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        <div className="flex items-center mb-4">
          <div
            className={clsx("p-2 rounded-full mr-3", "bg-red-100 text-red-500")}
          >
            <LogOut className="w-5 h-5" />
          </div>
          <h3
            className={clsx(
              "text-lg font-medium",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Leave Group
          </h3>
        </div>

        <p
          className={clsx(
            "mb-6",
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          )}
        >
          {message}
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            onClick={onClose}
            className={clsx(
              "border bg-transparent",
              theme === "dark"
                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            )}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            color="dark1"
            className="text-white bg-red-500 hover:bg-red-600"
          >
            Leave Group
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeaveGroupModal;
