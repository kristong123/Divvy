import React, { useState } from "react";
import clsx from "clsx";
import Modal from "../shared/Modal";
import ProfileAvatar from "../shared/ProfileAvatar";
import { toast } from "react-hot-toast";
import { groupActions } from "../../store/slice/groupSlice";
import { store } from "../../store/store";

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
  groupId,
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

      // Send to server via socket
      onConfirm(item, parseFloat(amount), selectedParticipants);

      // Manually update the UI immediately
      const tempExpense = {
        id: `temp-${Date.now()}`,
        item,
        amount: parseFloat(amount),
        paidBy,
        addedBy: currentUser,
        splitBetween: selectedParticipants,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Get current group and expenses
      const state = store.getState();
      const group = state.groups.groups[groupId];

      if (group && group.currentEvent) {
        // Create updated expenses array
        const updatedExpenses = [...group.currentEvent.expenses, tempExpense];

        // Update the Redux store directly
        store.dispatch(
          groupActions.setGroupEvent({
            groupId,
            event: {
              ...group.currentEvent,
              expenses: updatedExpenses,
            },
            keepEventOpen: true,
          })
        );
      }

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
          className="w-full px-3 py-3 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-3 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div>
          <div className="text-sm font-medium mb-2 text-black">
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
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                )}
              >
                <ProfileAvatar username={participant.username} size={32} />
                <span className="text-sm text-black">
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
