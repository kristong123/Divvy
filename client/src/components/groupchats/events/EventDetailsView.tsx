import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import ProfileFrame from "../../shared/ProfileFrame";
import AddExpenseModal from "../../modals/AddExpenseModal";
import ExpenseBreakdown from "./ExpenseBreakdown";
import { Expense } from "../../../types/groupTypes";
import { addExpense as addExpenseSocket } from "../../../services/socketService";
import { useTheme } from "../../../context/ThemeContext";
import Button from "../../shared/Button";

interface EventDetailsProps {
  description: string;
  expenses: Expense[];
  participants: Array<{
    username: string;
    profilePicture: string | null;
    venmoUsername?: string;
    isAdmin?: boolean;
  }>;
  onCancel: () => void;
  groupId: string;
}

const EventDetailsView: React.FC<EventDetailsProps> = ({
  description,
  expenses,
  participants,
  onCancel,
  groupId,
}) => {
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const { theme } = useTheme();

  const currentUser = useSelector((state: RootState) => state.user.username);

  const totalAmount = React.useMemo(() => {
    return expenses.reduce((sum, expense) => {
      // Skip expenses where the current user is both the payer and the one who paid
      if (expense.addedBy === currentUser && expense.paidBy === currentUser) {
        return sum;
      }
      return sum + expense.amount;
    }, 0);
  }, [expenses, currentUser]);

  // Add a function to handle expense addition
  const handleAddExpense = (
    item: string,
    amount: number,
    splitBetween: string[]
  ) => {
    // Create the expense object
    const expense = {
      itemName: item,
      amount,
      paidBy: currentUser,
      splitBetween:
        splitBetween.length > 0
          ? splitBetween
          : participants.map((p) => p.username),
    };

    // Only use socket service to handle expenses - don't dispatch to Redux
    // This prevents duplicate expenses
    addExpenseSocket(groupId, expense);

    // Close the modal (toast is handled in the modal component)
    setShowAddExpenseModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Description - only show if there is a description */}
      {description && description.trim() !== "" && (
        <div
          className={`rounded-xl p-6 shadow-md mb-6 ${
            theme === "dark"
              ? "bg-gray-800 text-gray-200"
              : "bg-white text-gray-600"
          }`}
        >
          <p
            className={`whitespace-pre-wrap ${
              theme === "dark" ? "text-gray-200" : "text-gray-600"
            }`}
          >
            {description}
          </p>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left side - Back button and Total */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-gray-500">
              Total cost: ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right side - Participants and Buttons */}
        <div className="flex flex-col items-end">
          <div className="flex gap-3 mb-4">
            <Button
              onClick={() => setShowAddExpenseModal(true)}
              color="dark1"
              className="text-white"
            >
              Add Expense
            </Button>
            <Button
              onClick={onCancel}
              color="red-500"
              className="text-white hover:bg-red-600"
            >
              Cancel Event
            </Button>
          </div>
          <div className="flex gap-2">
            {participants.map((participant) => (
              <div
                key={participant.username}
                className="flex flex-col items-center"
              >
                <ProfileFrame username={participant.username} size={32} />
                <span className="text-xs text-gray-600">
                  {participant.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onConfirm={handleAddExpense}
        participants={participants}
        groupId={groupId}
      />

      <div className="mt-6">
        <ExpenseBreakdown groupId={groupId} />
      </div>
    </div>
  );
};

export default EventDetailsView;
