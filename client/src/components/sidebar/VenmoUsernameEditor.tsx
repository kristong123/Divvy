import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { toast } from 'react-hot-toast';
import { updateVenmoUsername as emitVenmoUpdate } from '../../services/socketService';
import VenmoIcon from '../shared/VenmoIcon';

const VenmoUsernameEditor: React.FC = () => {
  const { username, venmoUsername, isLoggedIn } = useSelector((state: RootState) => {
    return state.user;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newVenmoUsername, setNewVenmoUsername] = useState('');

  useEffect(() => {
    if (venmoUsername) {
      setNewVenmoUsername(venmoUsername);
    }
  }, [venmoUsername]);

  if (!isLoggedIn) {
    return null;
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewVenmoUsername(e.target.value);
  };

  const handleBlur = async () => {
    setIsEditing(false);
    const trimmedUsername = newVenmoUsername.trim();
    
    if (trimmedUsername !== venmoUsername && username && trimmedUsername !== '') {
      try {
        await emitVenmoUpdate(username, trimmedUsername);
        toast.success('Venmo username updated!');
      } catch (error) {
        console.error('Error updating Venmo username:', error);
        toast.error('Failed to update Venmo username');
        setNewVenmoUsername(venmoUsername || '');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div className="flex items-center w-fit">
      {isEditing ? (
        <input
          type="text"
          value={newVenmoUsername}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyPress}
          className="border-b border-gray-300 focus:outline-none text-black w-28"
          autoFocus
        />
      ) : (
        <span onClick={handleEdit} className="text-gray-600 cursor-pointer ml-2">
          {venmoUsername ? `@${venmoUsername}` : 'Add Venmo'}
        </span>
      )}
      <VenmoIcon className="inline-block ml-1" color="#3D95CE" />
    </div>
  );
};

export default VenmoUsernameEditor; 