import React from 'react';
import Modal from '../shared/Modal';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  recipient: string;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  recipient
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Payment"
      actionButton={{
        text: "Confirm Payment",
        onClick: onConfirm,
        color: "success"
      }}
    >
      <div className="mt-4">
        <p className="text-gray-600">
          Are you sure you want to send ${amount.toFixed(2)} to {recipient}?
        </p>
      </div>
    </Modal>
  );
};

export default PaymentConfirmationModal; 