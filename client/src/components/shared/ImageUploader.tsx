import React, { useRef, ReactNode } from "react";
import clsx from "clsx";

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  overlayText?: string;
  showOverlay?: boolean;
}

/**
 * A reusable component for handling image uploads
 * Wraps any component and adds file upload functionality
 */
const ImageUploader: React.FC<ImageUploaderProps> = ({
  onFileSelect,
  children,
  className = "",
  overlayClassName = "",
  overlayText = "Edit",
  showOverlay = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const defaultOverlayClasses = clsx(
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

  const overlayClasses = overlayClassName || defaultOverlayClasses;

  return (
    <div
      className={`relative cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="group">
        {children}
        {showOverlay && (
          <div className={overlayClasses}>
            <span className="text-white text-xs">{overlayText}</span>
          </div>
        )}
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

export default ImageUploader;
