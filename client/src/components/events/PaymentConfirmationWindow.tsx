import React from 'react';

interface PaymentConfirmationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipient: string;
  amount: number;
}

const PaymentConfirmationWindow: React.FC<PaymentConfirmationWindowProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipient,
  amount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[1000]">
      <div className="w-[400px] p-6 bg-white rounded-2xl shadow-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-medium text-black mb-4">Confirm Payment</h2>
        
        <p className="text-gray-600 mb-6">
          Did you complete the Venmo payment of ${amount.toFixed(2)} to {recipient}?
        </p>

        <div className="flex justify-end gap-3">
          <button 
            className="px-4 py-2 text-sm rounded-lg border-none cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={onClose}
          >
            No, keep expenses
          </button>
          <button 
            className="px-4 py-2 text-sm rounded-lg border-none cursor-pointer bg-[#57E3DC] text-white hover:bg-[#4DC8C2]"
            onClick={onConfirm}
          >
            Yes, clear expenses
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationWindow; 