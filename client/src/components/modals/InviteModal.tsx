import React, { useState } from "react";
import Modal from "../shared/Modal";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onInvite: (username: string) => Promise<void>;
}

const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  onInvite,
}) => {
  const [username, setUsername] = useState("");

  const handleInvite = async () => {
    if (!username.trim()) return;

    await onInvite(username);
    setUsername("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite to Group"
      actionButton={{
        text: "Send Invite",
        onClick: handleInvite,
        color: "primary",
        disabled: !username.trim(),
      }}
    >
      <div className="mt-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        />
      </div>
    </Modal>
  );
};

export default InviteModal;
