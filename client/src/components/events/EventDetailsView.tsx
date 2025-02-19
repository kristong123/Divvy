import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import ProfileAvatar from '../shared/ProfileAvatar';
import AddExpenseWindow from './AddExpenseWindow';
import { addExpense } from '../../services/socketService';

interface Expense {
  item: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
}

interface EventDetailsProps {
  eventName: string;
  eventDate: string;
  description: string;
  expenses: Expense[];
  participants: Array<{
    username: string;
    profilePicture?: string | null;
    isAdmin?: boolean;
  }>;
  currentUser: string | null;
  onClose: () => void;
  onCancel: () => void;
  groupId: string;
}

const EventDetailsView: React.FC<EventDetailsProps> = ({
  eventName,
  eventDate,
  description,
  expenses,
  participants,
  currentUser,
  onClose,
  onCancel,
  groupId
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const container = clsx(
    'flex flex-col w-full h-full',
    'bg-white'
  );

  const header = clsx(
    'flex items-center justify-between',
    'p-6 border-b'
  );

  const title = clsx(
    'text-2xl font-bold',
    'text-black'
  );

  const descriptionBox = clsx(
    'p-6',
    'bg-[#F8F9FA]',
    'border-b'
  );

  const expensesSection = clsx(
    'flex-1',
    'p-6'
  );

  const expenseCard = clsx(
    'bg-[#E7FCFB]',
    'rounded-xl p-4 mb-4',
    'shadow-sm'
  );

  const addExpenseButton = clsx(
    'w-full p-4',
    'bg-[#57E3DC] bg-opacity-20',
    'rounded-xl',
    'flex items-center justify-center',
    'cursor-pointer',
    'hover:bg-opacity-30',
    'transition-colors'
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
    const venmoUrl = `https://venmo.com/?txn=pay&audience=private&recipients=${recipient}&amount=${amount.toFixed(2)}`;
    window.open(venmoUrl, '_blank');
  };

  return (
    <div className={container}>
      <div className={header}>
        <div>
          <h1 className={title}>{eventName}</h1>
          <p className="text-gray-600">{new Date(eventDate).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {participants.map(participant => (
            <ProfileAvatar
              key={participant.username}
              username={participant.username}
              imageUrl={participant.profilePicture}
              size="sm"
            />
          ))}
        </div>
      </div>

      <div className={descriptionBox}>
        <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
      </div>

      <div className={expensesSection}>
        <h2 className="text-xl font-semibold mb-4">Expenses</h2>
        
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

        <button 
          className={addExpenseButton}
          onClick={() => setIsExpenseModalOpen(true)}
        >
          <span className="text-[#57E3DC] text-xl mr-2">+</span>
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