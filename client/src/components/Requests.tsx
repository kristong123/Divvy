import { UserRound, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '../store/store';
import { AppDispatch } from '../store/store';
import {
  fetchPendingRequests,
  fetchSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '../store/slice/friendsSlice';
import { toast } from 'react-hot-toast';

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

  const avatarWrapper = clsx(
    // Layout
    'flex rounded-full w-8 h-8',
    // Appearance
    'bg-gradient-to-br from-dark2 to-light1',
    // Position
    'relative'
  );

  const avatarInner = clsx(
    // Layout
    'm-auto'
  );

  const profileImage = clsx(
    // Layout
    'w-7 h-7',
    // Appearance
    'rounded-full object-cover'
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
        const resultAction = await dispatch(
          sendFriendRequest({ user1: username, user2: friendUsername })
        ).unwrap();
        toast.success(resultAction.message);
        setFriendUsername('');
      } catch (error) {
        toast.error('Failed to send friend request');
      }
    }
  };

  const handleAcceptRequest = async (senderUsername: string) => {
    if (username) {
      try {
        const resultAction = await dispatch(
          acceptFriendRequest({ user1: senderUsername, user2: username })
        ).unwrap();
        toast.success(resultAction.message);
      } catch (error) {
        toast.error('Failed to accept friend request');
      }
    }
  };

  const handleDeclineRequest = async (senderUsername: string) => {
    if (username) {
      try {
        const resultAction = await dispatch(
          declineFriendRequest({ user1: senderUsername, user2: username })
        ).unwrap();
        toast.success(resultAction.message);
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
          <div key={request.sender} className={requestItem}>
            <div className={userInfo}>
              <div className={avatarWrapper}>
                <div className={avatarInner}>
                  {request.profilePicture ? (
                    <img 
                      src={request.profilePicture} 
                      alt={request.sender}
                      className={profileImage}
                      onError={(e) => {
                        e.currentTarget.src = '';
                        toast.error(`Failed to load ${request.sender}'s profile picture`);
                      }}
                    />
                  ) : (
                    <UserRound className="text-white m-auto h-6 w-6"/>
                  )}
                </div>
              </div>
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
          <div key={request.recipient} className={requestItem}>
            <div className={userInfo}>
              <div className={avatarWrapper}>
                <div className={avatarInner}>
                  {request.profilePicture ? (
                    <img 
                      src={request.profilePicture} 
                      alt={request.recipient}
                      className={profileImage}
                      onError={(e) => {
                        e.currentTarget.src = '';
                        toast.error(`Failed to load ${request.recipient}'s profile picture`);
                      }}
                    />
                  ) : (
                    <UserRound className="text-white m-auto h-6 w-6"/>
                  )}
                </div>
              </div>
              <span className={usernameStyle}>{request.recipient}</span>
            </div>
            <span className={statusText}>
              {request.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Requests;
