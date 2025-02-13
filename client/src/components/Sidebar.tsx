import { UserRound, UserRoundPlus, UsersRound, Bell } from 'lucide-react';
import { useSelector } from 'react-redux'; // Import useSelector
import { RootState } from '../store/store'; // Import RootState to type the state
import { useState, useEffect } from 'react';

const Sidebar: React.FC = () => {
  // Access the username from the Redux store
  const username = useSelector((state: RootState) => state.user.username);
  const [activeSection, setActiveSection] = useState<'notifications' | 'friends' | 'requests'>('friends');
  const [friendUsername, setFriendUsername] = useState('');
  const [pendingRequests, setPendingRequests] = useState<Array<{ sender: string, createdAt: string }>>([]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/friends/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user1: username,
          user2: friendUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setFriendUsername(''); // Clear input after successful request
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to send friend request. Please try again.');
    }
  };

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (activeSection === 'requests' && username) {
        try {
          const response = await fetch(`/api/friends/pending-requests/${username}`);
          const data = await response.json();
          setPendingRequests(data.pendingRequests);
        } catch (error) {
          console.error('Failed to fetch pending requests:', error);
        }
      }
    };

    fetchPendingRequests();
  }, [activeSection, username]);

  return (
    <div className='row'>
      <div className='w-60'>
        <div className='col h-fit'>
          <div className='row p-4'>
            <div className='flex rounded-full w-16 h-16 bg-gradient-to-br from-dark2 to-light1'>
              <UserRound className='m-auto h-12 w-12'/>
            </div>
            <p className='ml-4 my-auto text-2xl font-bold text-black'>
              {username || 'Guest'}
            </p> 
          </div>
          <div className='h-0.5 bg-gradient-to-l from-black to-white'></div>
          <div className='row py-3'>
            <button 
              onClick={() => setActiveSection('notifications')}
              className='m-auto'
            >
              <Bell className={`h-8 w-8 ${activeSection === 'notifications' ? 'stroke-dark1' : 'stroke-black'}`}/>
            </button>
            <button 
              onClick={() => setActiveSection('friends')}
              className='m-auto'
            >
              <UsersRound className={`h-8 w-8 ${activeSection === 'friends' ? 'stroke-dark1' : 'stroke-black'}`}/>
            </button>
            <button 
              onClick={() => setActiveSection('requests')}
              className='m-auto'
            >
              <UserRoundPlus className={`h-8 w-8 ${activeSection === 'requests' ? 'stroke-dark1' : 'stroke-black'}`}/>
            </button>
          </div>
          <div>
            {activeSection === 'notifications' && (
              <div className="p-4 pt-0">
                <p className="text-sm font-bold text-black">Notifications</p>
                {/* Notifications content */}
              </div>
            )}
            {activeSection === 'friends' && (
              <div className="p-4 pt-0">
                <p className="text-sm font-bold text-black">Friends</p>
                {/* Friends list content */}
              </div>
            )}
            {activeSection === 'requests' && (
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
                    <div key={request.sender} className="text-sm text-black">
                      {request.sender}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='w-0.5 bg-gradient-to-b from-black to-white'></div>
    </div>
  );
};

export default Sidebar;