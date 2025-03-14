import React, { useState } from "react";
import clsx from "clsx";
import Modal from "../shared/Modal";
import ProfileFrame from "../shared/ProfileFrame";
import { toast } from "react-hot-toast";
import { store } from "../../store/store";
import { preventEnterKeySubmission } from "../../utils/keyboardUtils";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: string, amount: number, splitBetween: string[]) => void;
  participants: Array<{
    username: string;
    profilePicture?: string | null;
    isAdmin?: boolean;
  }>;
  groupId: string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  participants,
}) => {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);

  // Initialize paidBy with the current user
  const currentUser = store.getState().user.username;
  const [paidBy, setPaidBy] = useState(currentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use selectedParticipants for splitBetween
    if (!item || !amount || !paidBy || selectedParticipants.length === 0) {
      toast.error("Please fill out all fields");
      return;
    }

    try {
      setSubmitting(true);

      // Send to server via socket - let the socket event update Redux
      onConfirm(item, parseFloat(amount), selectedParticipants);

      // Reset form and close modal
      setItem("");
      setAmount("");
      setPaidBy(currentUser);
      setSelectedParticipants([]);
      onClose();

      toast.success("Expense added successfully");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense"
      actionButton={{
        text: submitting ? "Adding..." : "Add Expense",
        onClick: () =>
          handleSubmit(new Event("click") as unknown as React.FormEvent),
        disabled:
          submitting ||
          !item.trim() ||
          !amount ||
          selectedParticipants.length === 0,
        color: "primary",
      }}
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="What was it for?"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          onKeyDown={preventEnterKeySubmission}
          className="w-full px-3 py-3 text-base text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          autoFocus
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={preventEnterKeySubmission}
          className="w-full px-3 py-3 text-base text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
        />

        <div>
          <div className="text-sm font-medium mb-2 text-black dark:text-white">
            Split between:
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <button
                key={participant.username}
                onClick={() =>
                  setSelectedParticipants((prev) =>
                    prev.includes(participant.username)
                      ? prev.filter((p) => p !== participant.username)
                      : [...prev, participant.username]
                  )
                }
                className={clsx(
                  "flex items-center gap-2",
                  "px-3 py-2 rounded-full",
                  "border transition-colors",
                  selectedParticipants.includes(participant.username)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                )}
              >
                <ProfileFrame username={participant.username} size={32} />
                <span className="text-sm text-black dark:text-white">
                  {participant.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddExpenseModal;
