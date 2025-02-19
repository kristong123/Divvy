import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import ProfileAvatar from '../shared/ProfileAvatar';
import AddExpenseWindow from './AddExpenseWindow';
import { addExpense } from '../../services/socketService';

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
  }>;
  currentUser: string | null;
  onClose: () => void;
  onCancel: () => void;
  groupId: string;
}

const EventDetailsView: React.FC<EventDetailsProps> = ({
  description,
  expenses,
  participants,
  currentUser,
  onClose,
  onCancel,
  groupId
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const expenseCard = clsx(
    'bg-[#E7FCFB]',
    'rounded-xl p-4 mb-4',
    'shadow-sm'
  );

  // Calculate what current user owes to others
  const userDebts = useMemo(() => {
    const debts: Record<string, number> = {};
    
    expenses.forEach(expense => {
      if (expense.splitBetween.includes(currentUser || '')) {
        const amountPerPerson = expense.amount / expense.splitBetween.length;
        if (expense.paidBy !== currentUser) {
          debts[expense.paidBy] = (debts[expense.paidBy] || 0) + amountPerPerson;
        }
      }
    });

    return debts;
  }, [expenses, currentUser]);

  const handleVenmoPayment = (recipient: string, amount: number) => {
    const venmoUrl = `https://account.venmo.com/pay?audience=private&amount=${amount.toFixed(2)}&note=&recipients=${recipient}%&txn=pay`;
    window.open(venmoUrl, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-gray-600 whitespace-pre-wrap">{description}</p>
        </div>

        <h3 className="text-lg font-semibold mb-4">Expenses</h3>
        <div className="space-y-4">
          {expenses.map((expense, index) => (
            <div key={index} className={expenseCard}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <ProfileAvatar
                    username={expense.paidBy}
                    size="sm"
                  />
                  <span className="font-medium">{expense.item}</span>
                </div>
                <span className="text-[#57E3DC] font-bold">
                  ${expense.amount.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Split between: {expense.splitBetween.join(', ')}
              </div>
            </div>
          ))}
        </div>

        <button 
          className="mt-6 w-full py-2 bg-[#57E3DC] text-white rounded-lg hover:bg-[#4DC8C2]"
          onClick={() => setIsExpenseModalOpen(true)}
        >
          Add Expense
        </button>
      </div>

      {/* Add payment section */}
      {Object.keys(userDebts).length > 0 && (
        <div className="border-t mt-4 pt-4">
          <h3 className="text-xl font-semibold mb-4">Outstanding Payments</h3>
          {Object.entries(userDebts).map(([recipient, amount]) => (
            <div key={recipient} className="flex items-center justify-between mb-2">
              <span>You owe {recipient}: ${amount.toFixed(2)}</span>
              <button
                onClick={() => handleVenmoPayment(recipient, amount)}
                className="px-4 py-2 bg-[#3D95CE] text-white rounded-lg"
              >
                Pay with Venmo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add cancel button */}
      <div className="border-t mt-4 pt-4 flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
        >
          Close
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Cancel Event
        </button>
      </div>

      <AddExpenseWindow
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onConfirm={(item, amount, splitBetween) => {
          const newExpense = {
            item,
            amount,
            paidBy: currentUser as string,
            splitBetween,
            timestamp: new Date().toISOString()
          };
          
          // Use socket to add expense
          addExpense(groupId, newExpense);
          setIsExpenseModalOpen(false);
        }}
        participants={participants}
      />
    </div>
  );
};

export default EventDetailsView; 