import { Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '../../store/store';
import { AppDispatch } from '../../store/store';
import {
  fetchPendingRequests,
  fetchSentRequests,
  setPendingRequests,
  removePendingRequest,
} from '../../store/slice/friendsSlice';
import { toast } from 'react-hot-toast';
import ProfileAvatar from '../shared/ProfileAvatar';
import { 
  sendFriendRequest as sendFriendRequestSocket, 
  acceptFriendRequest as acceptFriendRequestSocket, 
  declineFriendRequest as declineFriendRequestSocket,
  getSocket 
} from '../../services/socketService';

const Requests: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.user.username);
  const pendingRequests = useSelector((state: RootState) => state.friends.pendingRequests);
  const sentRequests = useSelector((state: RootState) => state.friends.sentRequests);
  const [friendUsername, setFriendUsername] = useState('');
  const [requestsKey, setRequestsKey] = useState(0);
  const [declinedRequests, setDeclinedRequests] = useState<string[]>([]);
  const [acceptedSentRequests, setAcceptedSentRequests] = useState<string[]>([]);
  const [forceRefresh, setForceRefresh] = useState(0);

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

  useEffect(() => {
    console.log("Pending requests updated:", pendingRequests);
  }, [pendingRequests]);

  useEffect(() => {
    console.log("Sent requests updated:", sentRequests);
  }, [sentRequests]);

  useEffect(() => {
    // Force re-render when pendingRequests changes
    setRequestsKey(prev => prev + 1);
  }, [pendingRequests]);

  useEffect(() => {
    // Cleanup function to ensure we're not using stale data
    return () => {
      if (username) {
        dispatch(fetchPendingRequests(username));
      }
    };
  }, [dispatch, username]);

  // Add this effect to listen for friend request accepted events
  useEffect(() => {
    // Update acceptedSentRequests when a friend request is accepted
    const handleRequestAccepted = (data: any) => {
      if (data.sender === username) {
        setAcceptedSentRequests(prev => [...prev, data.recipient]);
      }
    };
    
    // Get the socket
    const socket = getSocket();
    socket.on('friend-request-accepted', handleRequestAccepted);
    
    return () => {
      socket.off('friend-request-accepted', handleRequestAccepted);
    };
  }, [username]);

  // Add this effect to listen for sent request updates
  useEffect(() => {
    const handleSentRequestUpdate = () => {
      if (username) {
        dispatch(fetchSentRequests(username));
      }
    };
    
    const socket = getSocket();
    socket.on('sent-request-accepted', handleSentRequestUpdate);
    socket.on('sent-request-declined', handleSentRequestUpdate);
    
    return () => {
      socket.off('sent-request-accepted', handleSentRequestUpdate);
      socket.off('sent-request-declined', handleSentRequestUpdate);
    };
  }, [dispatch, username]);

  // Add this effect to listen for new friend requests and clear declined state
  useEffect(() => {
    const handleNewFriendRequest = (data: any) => {
      // When a new request comes in, remove that sender from the declined list
      if (data.sender) {
        setDeclinedRequests(prev => prev.filter(name => name !== data.sender));
      }
    };
    
    const socket = getSocket();
    socket.on('new-friend-request', handleNewFriendRequest);
    
    return () => {
      socket.off('new-friend-request', handleNewFriendRequest);
    };
  }, []);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && friendUsername) {
      try {
        sendFriendRequestSocket({ 
          sender: username, 
          recipient: friendUsername 
        });
        setFriendUsername('');
      } catch (_error) {
        console.error('Failed to send friend request:', _error);
        toast.error('Failed to send friend request');
      }
    }
  };

  const handleAcceptRequest = async (senderUsername: string) => {
    if (username) {
      try {
        // Directly remove this specific request
        dispatch(removePendingRequest(senderUsername));
        
        // Force a re-render
        setForceRefresh(prev => prev + 1);
        
        // Also directly hide the element as a fallback
        const element = document.getElementById(`pending-${senderUsername}`);
        if (element) {
          element.style.display = 'none';
        }
        
        // Then send the accept request to the server
        acceptFriendRequestSocket({ 
          sender: senderUsername, 
          recipient: username 
        });
        
        // Add a success toast
        toast.success(`Friend request from ${senderUsername} accepted`);
      } catch (error) {
        console.error('Failed to accept friend request:', error);
        toast.error('Failed to accept friend request');
        
        // If there's an error, revert by re-fetching
        dispatch(fetchPendingRequests(username));
      }
    }
  };

  const handleDeclineRequest = async (senderUsername: string) => {
    if (username) {
      try {
        // Add to declined requests
        setDeclinedRequests(prev => [...prev, senderUsername]);
        
        // Update Redux state
        const updatedRequests = [...pendingRequests].filter(
          req => req.sender !== senderUsername
        );
        
        dispatch(setPendingRequests(updatedRequests));
        
        // Then send the decline request to the server
        declineFriendRequestSocket({ 
          sender: senderUsername, 
          recipient: username 
        });
        
        // Add a success toast
        toast.success('Friend request declined');
      } catch (error) {
        console.error('Failed to decline friend request:', error);
        toast.error('Failed to decline friend request');
        
        // Remove from declined requests on error
        setDeclinedRequests(prev => prev.filter(name => name !== senderUsername));
        
        // Re-fetch the pending requests
        dispatch(fetchPendingRequests(username));
      }
    }
  };

  // Add a computed value for the actual pending count
  const actualPendingCount = pendingRequests.filter(
    request => !declinedRequests.includes(request.sender)
  ).length;

  // Add a computed value for the actual sent count
  const actualSentCount = sentRequests.filter(
    request => !acceptedSentRequests.includes(request.recipient)
  ).length;

  console.log("Rendering Requests component with:", {
    pendingRequests,
    pendingCount: pendingRequests.length
  });

  return (
    <div className={container} key={`requests-${requestsKey}-${forceRefresh}`}>
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
      <p className="mt-4 text-sm font-bold text-black">
        Friend Requests ({actualPendingCount})
      </p>
      <div className="mt-2">
        {pendingRequests
          .filter(request => !declinedRequests.includes(request.sender))
          .map((request) => (
            <div 
              key={request.id || `pending-${request.sender}-${Date.now()}`}
              id={`pending-${request.sender}`}
              className={requestItem}
            >
              <div className={userInfo}>
                <ProfileAvatar
                    username={request.sender}
                    size={32}
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
      <p className="mt-4 text-sm font-bold text-black">
        Sent Requests ({actualSentCount})
      </p>
      <div className="mt-2">
        {sentRequests
          .filter(request => !acceptedSentRequests.includes(request.recipient))
          .map((request) => (
            <div 
              key={request.id || `sent-${request.recipient}-${Date.now()}`} 
              id={`sent-${request.recipient}`}
              className={requestItem}
            >
              <div className={userInfo}>
                <ProfileAvatar
                  username={request.recipient}
                  size={32}
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
