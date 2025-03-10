import React from "react";
import Modal from "../shared/Modal";
import { toast } from "react-hot-toast";
import { removeExpense } from "../../services/socketService";
import ProfileFrame from "../shared/ProfileFrame";
import { useTheme } from "../../context/ThemeContext";
import { Expense } from "../../types/groupTypes";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface PaymentConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  payee: string;
  amount: number;
  groupId: string;
  expenses: Expense[];
}

const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  isOpen,
  onClose,
  payee,
  amount,
  groupId,
  expenses,
}) => {
  const { theme } = useTheme();
  const currentUser = useSelector((state: RootState) => state.user.username);

  const handleConfirmPayment = () => {
    try {
      // Filter expenses where:
      // 1. The expense was added by the payee (the person being paid)
      // 2. The current user is the debtor (the person who owes money)
      const expensesToRemove = expenses.filter((expense) => {
        // Check if expense was added by the payee
        if (expense.addedBy !== payee) return false;

        // Check if current user is the debtor
        if ((expense as any)._debtor === currentUser) {
          return true;
        }

        // For backward compatibility, check _splitBetween
        if (
          (expense as any)._splitBetween &&
          Array.isArray((expense as any)._splitBetween)
        ) {
          return (expense as any)._splitBetween.includes(currentUser);
        }

        return false;
      });

      if (expensesToRemove.length === 0) {
        toast.error("No expenses found to remove");
        onClose();
        return;
      }

      console.log(
        `Removing ${expensesToRemove.length} expenses after payment confirmation`
      );

      // Log the expenses being removed for debugging
      let hasErrors = false;

      expensesToRemove.forEach((expense, index) => {
        console.log(`Expense ${index + 1}:`, {
          id: expense.id || "MISSING ID",
          itemName: expense.itemName,
          amount: expense.amount,
          addedBy: expense.addedBy,
          debtor: (expense as any)._debtor,
        });

        // Make sure the expense has an ID
        if (!expense.id) {
          console.error("Expense is missing ID:", expense);
          hasErrors = true;

          // Generate a temporary ID if needed
          expense.id = `temp_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          console.log(`Generated temporary ID for expense: ${expense.id}`);
        }

        // Remove the expense
        removeExpense(groupId, expense);
      });

      if (hasErrors) {
        toast.error(
          "Some expenses had missing IDs. Generated temporary IDs to proceed."
        );
      } else {
        toast.success(`Payment to ${payee} confirmed!`);
      }

      onClose();
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast.error("Failed to confirm payment. Please try again.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Payment"
      actionButton={{
        text: "Yes, I've paid",
        onClick: handleConfirmPayment,
        color: "success",
      }}
      size="md"
    >
      <div className="py-4">
        <div className="flex items-center mb-4">
          <ProfileFrame username={payee} size={40} />
          <div className="ml-3">
            <p
              className={`font-medium ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {payee}
            </p>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-gray-300" : "text-gray-500"
              }`}
            >
              Amount: ${amount.toFixed(2)}
            </p>
          </div>
        </div>

        <div
          className={`rounded-lg p-4 mb-4 ${
            theme === "dark"
              ? "bg-gray-700 text-white"
              : "bg-gray-50 text-gray-700"
          }`}
        >
          <p className="text-sm mb-2">
            <strong>Have you actually paid {payee}?</strong>
          </p>
          <p className="text-sm">
            If you confirm, all expenses assigned to you by {payee} will be
            marked as paid and removed.
          </p>
        </div>

        <div
          className={`text-sm ${
            theme === "dark" ? "text-gray-300" : "text-gray-500"
          }`}
        >
          <p>• If you haven't paid yet, click "Cancel"</p>
          <p>• Only confirm if you've completed the payment</p>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentConfirmation;
