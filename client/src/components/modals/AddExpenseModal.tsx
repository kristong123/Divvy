import React, { useState } from 'react';
import clsx from 'clsx';
import Modal from '../shared/Modal';
import ProfileAvatar from '../shared/ProfileAvatar';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: string, amount: number, splitBetween: string[]) => void;
  participants: Array<{
    username: string;
    profilePicture?: string | null;
    isAdmin?: boolean;
  }>;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  participants
}) => {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const handleSubmit = () => {
    if (item.trim() && amount && selectedParticipants.length > 0) {
      onConfirm(item.trim(), Number(amount), selectedParticipants);
      setItem('');
      setAmount('');
      setSelectedParticipants([]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense"
      actionButton={{
        text: "Add Expense",
        onClick: handleSubmit,
        disabled: !item.trim() || !amount || selectedParticipants.length === 0,
        color: "primary"
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
          <div className="text-sm font-medium mb-2 text-black">Split between:</div>
          <div className="flex flex-wrap gap-2">
            {participants.map(participant => (
              <button
                key={participant.username}
                onClick={() => setSelectedParticipants(prev => 
                  prev.includes(participant.username)
                    ? prev.filter(p => p !== participant.username)
                    : [...prev, participant.username]
                )}
                className={clsx(
                  'flex items-center gap-2',
                  'px-3 py-2 rounded-full',
                  'border transition-colors',
                  selectedParticipants.includes(participant.username)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <ProfileAvatar
                  username={participant.username}
                  imageUrl={participant.profilePicture}
                  size="sm"
                />
                <span className="text-sm text-black">{participant.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddExpenseModal; 