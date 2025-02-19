import React, { useState } from 'react';
import clsx from 'clsx';
import ProfileAvatar from '../shared/ProfileAvatar';

interface AddExpenseWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: string, amount: number, splitBetween: string[]) => void;
  participants: Array<{
    username: string;
    profilePicture?: string | null;
    isAdmin?: boolean;
  }>;
}

const AddExpenseWindow: React.FC<AddExpenseWindowProps> = ({
  isOpen,
  onClose,
  onConfirm,
  participants
}) => {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (item.trim() && amount && selectedParticipants.length > 0) {
      onConfirm(item.trim(), Number(amount), selectedParticipants);
      setItem('');
      setAmount('');
      setSelectedParticipants([]);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[1000]">
      <div className="w-[400px] p-6 bg-white rounded-2xl shadow-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-medium text-black mb-4">Add Expense</h2>
        
        <input
          type="text"
          placeholder="What was it for?"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="w-full px-3 py-3 mb-4 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:border-[#57E3DC]"
          autoFocus
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-3 mb-4 text-base text-black border border-gray-200 rounded-lg focus:outline-none focus:border-[#57E3DC]"
        />

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Split between:</div>
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
                    ? 'border-[#57E3DC] bg-[#E7FCFB]'
                    : 'border-gray-200 bg-white'
                )}
              >
                <ProfileAvatar
                  username={participant.username}
                  imageUrl={participant.profilePicture}
                  size="sm"
                />
                <span className="text-sm">{participant.username}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            className="px-4 py-2 text-sm rounded-lg border-none cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 text-sm rounded-lg border-none cursor-pointer bg-[#57E3DC] text-white hover:bg-[#4DC8C2]"
            onClick={handleSubmit}
          >
            Add Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseWindow; 