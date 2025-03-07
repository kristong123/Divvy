import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { toast } from "react-hot-toast";
import ProfileAvatar from "../../shared/ProfileAvatar";
import PaymentConfirmationWindow from "../../modals/PaymentConfirmationModal";
import ExpenseBreakdown from "./ExpenseBreakdown";
import { Expense } from "../../../types/groupTypes";

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
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState({
    recipient: "",
    amount: 0,
  });

  const group = useSelector(
    (state: RootState) => state.groups.groups[groupId]
  );

  const totalAmount = React.useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  // Since we're removing paidBy and splitBetween, we need to change how we handle payments
  // For now, we'll just remove the expenses without filtering
  const handlePaymentConfirm = () => {
    if (!group?.currentEvent) return;

    // In a real implementation, you would need to track payments differently
    // This would need to be replaced with a proper payment tracking system
    toast.success(`Payment of $${paymentConfirmation.amount.toFixed(2)} to ${paymentConfirmation.recipient} confirmed!`);
    
    setShowPaymentConfirmation(false);
  };

  // Add a function to handle showing payment confirmation
  const handleShowPayment = (recipient: string, amount: number) => {
    setPaymentConfirmation({ recipient, amount });
    setShowPaymentConfirmation(true);
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
              Total cost: ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right side - Participants and Buttons */}
        <div className="flex flex-col items-end">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleShowPayment("Example User", 10.00)}
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

      <PaymentConfirmationWindow
        isOpen={showPaymentConfirmation}
        onClose={() => setShowPaymentConfirmation(false)}
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
