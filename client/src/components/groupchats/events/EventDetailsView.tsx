import React, { useState, useMemo } from "react";
import ProfileAvatar from "../../shared/ProfileAvatar";
import AddExpenseModal from "../../modals/AddExpenseModal";
import { addExpense, updateEvent } from "../../../services/socketService";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import PaymentConfirmationWindow from "../../modals/PaymentConfirmationModal";
import ExpenseBreakdown from "./ExpenseBreakdown";

interface EventDetailsProps {
  description: string;
  expenses: Array<{
    item: string;
    amount: number;
    paidBy: string;
    splitBetween: string[];
  }>;
  participants: Array<{
    username: string;
    profilePicture: string | null;
    venmoUsername?: string;
    isAdmin?: boolean;
  }>;
  currentUser: string | null;
  onCancel: () => void;
  groupId: string;
}

const EventDetailsView: React.FC<EventDetailsProps> = ({
  description,
  expenses,
  participants,
  currentUser,
  onCancel,
  groupId,
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{
    isOpen: boolean;
    recipient: string;
    amount: number;
  }>({
    isOpen: false,
    recipient: "",
    amount: 0,
  });
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const handlePaymentConfirm = () => {
    if (!group?.currentEvent) return;

    // Filter out the expenses that were just paid
    const updatedExpenses = group.currentEvent.expenses.filter((expense) => {
      if (
        expense.paidBy === paymentConfirmation.recipient &&
        expense.splitBetween.includes(currentUser || "")
      ) {
        return false; // Remove this expense
      }
      if (
        expense.paidBy === currentUser &&
        expense.splitBetween.includes(paymentConfirmation.recipient)
      ) {
        return false; // Remove this expense
      }
      return true;
    });

    // Update the event with new expenses
    const updatedEvent = {
      ...group.currentEvent,
      expenses: updatedExpenses,
    };

    updateEvent(groupId, updatedEvent);
    setPaymentConfirmation({ isOpen: false, recipient: "", amount: 0 });
    toast.success("Payment confirmed and expenses cleared!");
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Description */}
      <div className="bg-white rounded-xl p-6 shadow-md mb-6">
        <p className="text-gray-600 whitespace-pre-wrap">{description}</p>
      </div>

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left side - Back button and Total */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-gray-500">
              Total cost: ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right side - Participants and Buttons */}
        <div className="flex flex-col items-end">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2 bg-[#57E3DC] text-white rounded-lg hover:bg-[#4DC8C2] transition-colors"
            >
              Add Expense
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Cancel Event
            </button>
          </div>
          <div className="flex gap-2">
            {participants.map((participant) => (
              <div
                key={participant.username}
                className="flex flex-col items-center"
              >
                <ProfileAvatar username={participant.username} size={32} />
                <span className="text-xs text-gray-600">
                  {participant.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onConfirm={(item, amount, splitBetween) => {
          const newExpense = {
            item,
            amount,
            paidBy: currentUser as string,
            splitBetween,
          };
          addExpense(groupId, newExpense);
          setIsExpenseModalOpen(false);
        }}
        participants={group.users}
        groupId={groupId}
      />

      <PaymentConfirmationWindow
        isOpen={paymentConfirmation.isOpen}
        onClose={() =>
          setPaymentConfirmation({ isOpen: false, recipient: "", amount: 0 })
        }
        onConfirm={handlePaymentConfirm}
        recipient={paymentConfirmation.recipient}
        amount={paymentConfirmation.amount}
      />

      <div className="mt-6">
        <ExpenseBreakdown groupId={groupId} />
      </div>
    </div>
  );
};

export default EventDetailsView;
