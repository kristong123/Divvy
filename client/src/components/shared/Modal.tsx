import React from "react";
import { Dialog } from "@headlessui/react";
import { useEnterKeyHandler } from "../../utils/keyboardUtils";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actionButton?: {
    text: string;
    onClick: () => void;
    color?: "primary" | "danger" | "success";
    disabled?: boolean;
  };
  size?: "sm" | "md" | "lg";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actionButton,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  const buttonColorMap = {
    primary: "dark1",
    danger: "red-500",
    success: "dark1",
  };

  useEnterKeyHandler(
    isOpen && !!actionButton,
    () => actionButton?.onClick(),
    actionButton?.disabled
  );

  if (!isOpen) return null;

  return (
    <Dialog as="div" className="relative z-50" onClose={onClose} open={isOpen}>
      <div
        className="fixed inset-0 bg-black/25 dark:bg-black/40"
        onClick={onClose}
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div
          className="flex min-h-full items-center justify-center p-4 text-center"
          onClick={onClose}
        >
          <div
            className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-colors duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title
              as="h3"
              className="text-lg font-medium leading-6 text-dark1 dark:text-dark1"
            >
              {title}
            </Dialog.Title>

            <div className="mt-2">{children}</div>

            <div className="mt-4 flex justify-end gap-2">
              {actionButton && (
                <Button
                  type="button"
                  color={buttonColorMap[actionButton.color || "primary"]}
                  onClick={actionButton.onClick}
                  disabled={actionButton.disabled}
                  className="text-white"
                >
                  {actionButton.text}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default Modal;
