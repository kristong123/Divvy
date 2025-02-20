import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { toast } from 'react-hot-toast';
import { updateVenmoUsername as emitVenmoUpdate } from '../../services/socketService';

const VenmoIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 512 512" 
    className="inline-block ml-1"
  >
    <path
      fill="#3D95CE"
      d="M444.17 32H70.28C49.85 32 32 46.7 32 66.89V441.6c0 20.31 17.85 38.4 38.28 38.4h373.78c20.54 0 35.94-18.2 35.94-38.39V66.89C480.12 46.7 464.6 32 444.17 32zM278 387H174.32l-41.57-248.56 90.75-8.62 22 176.87c20.53-33.45 45.88-86 45.88-121.87 0-19.62-3.36-33-8.61-44l82.63-16.72c9.56 15.78 13.86 32 13.86 52.57-.01 65.5-55.92 150.59-101.26 210.33z"
    />
  </svg>
);

const VenmoUsernameEditor: React.FC = () => {
  const { username, venmoUsername, isLoggedIn } = useSelector((state: RootState) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const [newVenmoUsername, setNewVenmoUsername] = useState('');

  console.log('Current user state:', { username, venmoUsername, isLoggedIn });

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
          {venmoUsername && venmoUsername.length > 0 ? `@${venmoUsername}` : 'Add Venmo'}
        </span>
      )}
      <VenmoIcon />
    </div>
  );
};

export default VenmoUsernameEditor; 