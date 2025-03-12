import React from "react";
import clsx from "clsx";
import { Calendar, AlertTriangle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Button from "../shared/Button";

interface CancelEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTitle?: string;
}

const CancelEventModal: React.FC<CancelEventModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const message = eventTitle
    ? `Are you sure you want to cancel "${eventTitle}"? This action cannot be undone.`
    : "Are you sure you want to cancel this event? This action cannot be undone.";

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
            className={clsx(
              "p-2 rounded-full mr-3",
              "bg-amber-100 text-amber-500"
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3
            className={clsx(
              "text-lg font-medium",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Cancel Event
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

        {eventTitle && (
          <div
            className={clsx(
              "p-3 mb-6 rounded-lg flex items-center",
              theme === "dark" ? "bg-gray-700" : "bg-gray-100"
            )}
          >
            <Calendar
              className={clsx(
                "w-5 h-5 mr-2",
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              )}
            />
            <span className="font-medium">{eventTitle}</span>
          </div>
        )}

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
            Keep Event
          </Button>
          <Button
            onClick={onConfirm}
            color="dark1"
            className="text-white bg-amber-500 hover:bg-amber-600"
          >
            Cancel Event
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelEventModal;
