import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Modal from '../shared/Modal';
import ProfileAvatar from '../shared/ProfileAvatar';
import { RootState } from '../../store/store';
import clsx from 'clsx';

interface GroupInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    onInvite: (usernames: string[]) => Promise<void>;
}

const GroupInviteModal: React.FC<GroupInviteModalProps> = ({ 
    isOpen, 
    onClose,
    groupId,
    groupName,
    onInvite 
}) => {
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Get friends list from Redux store
    const friends = useSelector((state: RootState) => state.friends.friends);
    // Get group members from Redux store
    const groupMembers = useSelector((state: RootState) => state.groups.groups[groupId]?.users || []);

    // Filter out friends who are already in the group
    const availableFriends = friends.filter(friend => 
        !groupMembers.some(member => member.username === friend.username)
    );

    const handleToggleFriend = (username: string) => {
        setSelectedFriends(prev => 
            prev.includes(username)
                ? prev.filter(name => name !== username)
                : [...prev, username]
        );
    };

    const handleInvite = async () => {
        if (selectedFriends.length === 0) return;
        
        try {
            setLoading(true);
            await onInvite(selectedFriends);
            setSelectedFriends([]);
            onClose();
        } catch (error) {
            console.error('Error inviting friends:', error);
        } finally {
            setLoading(false);
        }
    };

    // Reset selections when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedFriends([]);
        }
    }, [isOpen]);

    const friendItem = clsx(
        'flex items-center justify-between',
        'p-3 mb-2',
        'border border-gray-200 rounded-lg',
        'hover:bg-gray-50 cursor-pointer'
    );

    const checkbox = (isSelected: boolean) => clsx(
        'w-5 h-5 rounded-md',
        'border-2',
        isSelected ? 'bg-[#57E3DC] border-[#57E3DC]' : 'border-gray-300'
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Invite Friends to ${groupName}`}
            actionButton={{
                text: `Invite ${selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}`,
                onClick: handleInvite,
                color: "primary",
                disabled: selectedFriends.length === 0 || loading
            }}
            size="md"
        >
            <div className="mt-4">
                <p className="text-gray-600 mb-4">
                    Select friends to invite to this group:
                </p>
                
                {availableFriends.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                        All your friends are already in this group.
                    </p>
                ) : (
                    <div className="max-h-60 overflow-y-auto">
                        {availableFriends.map(friend => (
                            <div 
                                key={friend.username} 
                                className={friendItem}
                                onClick={() => handleToggleFriend(friend.username)}
                            >
                                <div className="flex items-center">
                                    <ProfileAvatar
                                        username={friend.username}
                                        imageUrl={friend.profilePicture}
                                        size="sm"
                                    />
                                    <span className="ml-3 text-black">{friend.username}</span>
                                </div>
                                <div className={checkbox(selectedFriends.includes(friend.username))}>
                                    {selectedFriends.includes(friend.username) && (
                                        <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default GroupInviteModal; 