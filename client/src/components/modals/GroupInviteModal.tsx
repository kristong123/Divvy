import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import Modal from "../shared/Modal";
import ProfileAvatar from "../shared/ProfileAvatar";
import { RootState } from "../../store/store";
import clsx from "clsx";

interface GroupInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onInvite: (usernames: string[]) => Promise<void>;
}

const GroupInviteModal: React.FC<GroupInviteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onInvite,
}) => {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Get friends list from Redux store
  const friends = useSelector((state: RootState) => state.friends.friends);
  // Get group members from Redux store
  const groupMembers = useSelector(
    (state: RootState) => state.groups.groups[groupId]?.users || []
  );

  // Memoize the filtered friends list to prevent unnecessary rerenders
  const availableFriends = useMemo(() => {
    return friends.filter(
      (friend) =>
        !groupMembers.some((member) => member.username === friend.username)
    );
  }, [friends, groupMembers]);

  const handleToggleFriend = (username: string) => {
    setSelectedFriends((prev) =>
      prev.includes(username)
        ? prev.filter((name) => name !== username)
        : [...prev, username]
    );
  };

  const handleInvite = async () => {
    if (selectedFriends.length === 0) return;

    try {
      setLoading(true);
      await onInvite(selectedFriends);
      setSelectedFriends([]);
      onClose();
    } catch (error) {
      console.error("Error inviting friends:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFriends([]);
    }
  }, [isOpen]);

  const friendItem = (isSelected: boolean) =>
    clsx(
      "flex items-center",
      "w-fit p-3 mb-2",
      "border rounded-lg transition-colors",
      isSelected
        ? "border-[#57E3DC] bg-[#E7FCFB]"
        : "border-gray-200 hover:bg-gray-50",
      "cursor-pointer"
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Friends to ${groupName}`}
      actionButton={{
        text: `Invite ${
          selectedFriends.length > 0 ? `(${selectedFriends.length})` : ""
        }`,
        onClick: handleInvite,
        color: "primary",
        disabled: selectedFriends.length === 0 || loading,
      }}
      size="md"
    >
      <div className="mt-4">
        <p className="text-gray-600 mb-4">
          Select friends to invite to this group:
        </p>

        {availableFriends.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            All your friends are already in this group.
          </p>
        ) : (
          <div className="flex flex-row flex-wrap gap-2 max-h-60 overflow-y-auto">
            {availableFriends.map((friend) => (
              <div
                key={friend.username}
                className={friendItem(
                  selectedFriends.includes(friend.username)
                )}
                onClick={() => handleToggleFriend(friend.username)}
              >
                <div className="flex items-center">
                  <ProfileAvatar username={friend.username} size={40} />
                  <span className="ml-2 mr-1 text-black">
                    {friend.username}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GroupInviteModal;
