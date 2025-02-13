import { UserRound, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { AppDispatch } from '../store/store';
import {
  fetchPendingRequests,
  fetchSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '../store/slice/friendsSlice';

const Requests: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.user.username);
  const pendingRequests = useSelector((state: RootState) => state.friends.pendingRequests);
  const sentRequests = useSelector((state: RootState) => state.friends.sentRequests);
  const [friendUsername, setFriendUsername] = useState('');

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
        alert(resultAction.message);
        setFriendUsername('');
      } catch (error) {
        alert('Failed to send friend request');
      }
    }
  };

  const handleAcceptRequest = async (senderUsername: string) => {
    if (username) {
      try {
        const resultAction = await dispatch(
          acceptFriendRequest({ user1: senderUsername, user2: username })
        ).unwrap();
        alert(resultAction.message);
      } catch (error) {
        alert('Failed to accept friend request');
      }
    }
  };

  const handleDeclineRequest = async (senderUsername: string) => {
    if (username) {
      try {
        const resultAction = await dispatch(
          declineFriendRequest({ user1: senderUsername, user2: username })
        ).unwrap();
        alert(resultAction.message);
      } catch (error) {
        alert('Failed to decline friend request');
      }
    }
  };

  return (
    <div className="p-4 pt-0">
      <div className='col items-center'>
        <p className="text-sm font-bold text-black">Add Friend</p>
        <form onSubmit={handleSendFriendRequest} className="w-full">
          <input 
            className='w-full border-2 border-gray-300 focus:border-dark1
              rounded-md p-1 mb-0 mt-auto text-black' 
            placeholder='Username'
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
          />
        </form>
      </div>
      <p className="mt-4 text-sm font-bold text-black">Friend Requests</p>
      <div className="mt-2">
        {pendingRequests.map((request) => (
          <div key={request.sender} className="row text-sm text-black mb-2">
            <div className="flex items-center">
              <div className="flex rounded-full w-8 h-8 bg-gradient-to-br from-dark2 to-light1">
                <UserRound className="m-auto h-6 w-6"/>
              </div>
              <span className="ml-2">{request.sender}</span>
            </div>
            <div className="flex gap-2 ml-4">
              <button 
                className="text-green-500 hover:text-green-600"
                onClick={() => handleAcceptRequest(request.sender)}
              >
                <Check className="h-5 w-5"/>
              </button>
              <button 
                className="text-red-500 hover:text-red-600"
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
          <div key={request.recipient} className="row text-sm text-black mb-2">
            <div className="flex items-center">
              <div className="flex rounded-full w-8 h-8 bg-gradient-to-br from-dark2 to-light1">
                <UserRound className="m-auto h-6 w-6"/>
              </div>
              <span className="ml-2">{request.recipient}</span>
            </div>
            <span className="ml-auto text-xs text-gray-500 italic">
              {request.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Requests;
