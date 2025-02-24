import React from 'react';
import { Dialog } from '@headlessui/react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actionButton?: {
        text: string;
        onClick: () => void;
        color?: 'primary' | 'danger' | 'success';
        disabled?: boolean;
    };
    size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    actionButton,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl'
    };

    const buttonColors = {
        primary: 'bg-[#57E3DC] hover:bg-[#4DC8C2]',
        danger: 'bg-red-600 hover:bg-red-700',
        success: 'bg-[#57E3DC] hover:bg-[#4DC8C2]'
    };

    if (!isOpen) return null;

    return (
        <Dialog as="div" className="relative z-50" onClose={onClose} open={isOpen}>
            <div className="fixed inset-0 bg-black/25" onClick={onClose} />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center" onClick={onClose}>
                    <div 
                        className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl`}
                        onClick={e => e.stopPropagation()}
                    >
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-dark1">
                            {title}
                        </Dialog.Title>

                        <div className="mt-2">
                            {children}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-dark1 hover:bg-gray-200 focus:outline-none"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            {actionButton && (
                                <button
                                    type="button"
                                    className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none ${buttonColors[actionButton.color || 'primary']} ${actionButton.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={actionButton.onClick}
                                    disabled={actionButton.disabled}
                                >
                                    {actionButton.text}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

export default Modal; 