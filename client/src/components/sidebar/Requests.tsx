import { Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '../../store/store';
import { AppDispatch } from '../../store/store';
import {
  fetchPendingRequests,
  fetchSentRequests,
} from '../../store/slice/friendsSlice';
import { toast } from 'react-hot-toast';
import ProfileAvatar from '../shared/ProfileAvatar';
import { sendFriendRequest as sendFriendRequestSocket, acceptFriendRequest as acceptFriendRequestSocket, declineFriendRequest as declineFriendRequestSocket } from '../../services/socketService';

const Requests: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.user.username);
  const pendingRequests = useSelector((state: RootState) => state.friends.pendingRequests);
  const sentRequests = useSelector((state: RootState) => state.friends.sentRequests);
  const [friendUsername, setFriendUsername] = useState('');

  const container = clsx(
    // Spacing
    'p-4 pt-0'
  );

  const addFriendSection = clsx(
    // Layout
    'flex flex-col items-center'
  );

  const sectionTitle = clsx(
    // Typography
    'text-sm font-bold text-black'
  );

  const addFriendForm = clsx(
    // Layout
    'w-full'
  );

  const input = clsx(
    // Layout
    'w-full',
    // Border
    'border-2 border-gray-300',
    'rounded-md',
    // Spacing
    'p-1 mb-0 mt-auto',
    // Typography
    'text-black',
    // Focus & Hover
    'focus:border-dark1',
    'hover:border-dark2',
    // Transitions
    'transition-all duration-300 ease-smooth'
  );

  const requestItem = clsx(
    // Layout
    'row text-sm text-black',
    // Spacing
    'mb-2'
  );

  const userInfo = clsx(
    // Layout
    'flex items-center'
  );

  const usernameStyle = clsx(
    // Spacing
    'ml-2'
  );

  const actionButtons = clsx(
    // Layout
    'flex gap-2',
    // Spacing
    'ml-4'
  );

  const acceptButton = clsx(
    // Color
    'text-green-500 hover:text-green-600',
    // Transitions
    'transition-colors duration-300 ease-smooth',
    'hover:scale-110 transform'
  );

  const declineButton = clsx(
    // Color
    'text-red-500 hover:text-red-600'
  );

  const statusText = clsx(
    // Layout
    'ml-auto',
    // Typography
    'text-xs text-gray-500 italic'
  );

  useEffect(() => {
    if (username) {
      dispatch(fetchPendingRequests(username));
      dispatch(fetchSentRequests(username));
    }
  }, [dispatch, username]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && friendUsername) {
      try {
        sendFriendRequestSocket({ 
          sender: username, 
          recipient: friendUsername 
        });
        setFriendUsername('');
      } catch (error) {
        toast.error('Failed to send friend request');
      }
    }
  };

  const handleAcceptRequest = async (senderUsername: string) => {
    if (username) {
      try {
        acceptFriendRequestSocket({ 
          sender: senderUsername, 
          recipient: username 
        });
      } catch (error) {
        toast.error('Failed to accept friend request');
      }
    }
  };

  const handleDeclineRequest = async (senderUsername: string) => {
    if (username) {
      try {
        declineFriendRequestSocket({ 
          sender: senderUsername, 
          recipient: username 
        });
      } catch (error) {
        toast.error('Failed to decline friend request');
      }
    }
  };

  return (
    <div className={container}>
      <div className={addFriendSection}>
        <p className={sectionTitle}>Add Friend</p>
        <form onSubmit={handleSendFriendRequest} className={addFriendForm}>
          <input 
            className={input}
            placeholder='Username'
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
          />
        </form>
      </div>
      <p className="mt-4 text-sm font-bold text-black">Friend Requests</p>
      <div className="mt-2">
        {pendingRequests.map((request) => (
          <div 
            key={request.id || `pending-${request.sender}-${Date.now()}`} 
            className={requestItem}
          >
            <div className={userInfo}>
              <ProfileAvatar
                username={request.sender}
                imageUrl={request.profilePicture}
                size="sm"
              />
              <span className={usernameStyle}>{request.sender}</span>
            </div>
            <div className={actionButtons}>
              <button 
                className={acceptButton}
                onClick={() => handleAcceptRequest(request.sender)}
              >
                <Check className="h-5 w-5"/>
              </button>
              <button 
                className={declineButton}
                onClick={() => handleDeclineRequest(request.sender)}
              >
                <X className="h-5 w-5"/>
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-bold text-black">Sent Requests</p>
      <div className="mt-2">
        {sentRequests.map((request) => (
          <div 
            key={request.id || `sent-${request.recipient}-${Date.now()}`} 
            className={requestItem}
          >
            <div className={userInfo}>
              <ProfileAvatar
                username={request.recipient}
                imageUrl={request.profilePicture}
                size="sm"
              />
              <span className={usernameStyle}>{request.recipient}</span>
              <span className={statusText}>
                {request.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Requests;
