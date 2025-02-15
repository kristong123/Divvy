import { UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { fetchFriends } from '../store/slice/friendsSlice';
import { AppDispatch } from '../store/store';
import { toast } from 'react-hot-toast';

const Friends: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.user.username);
  const friends = useSelector((state: RootState) => state.friends.friends);
  const loading = useSelector((state: RootState) => state.friends.loading);

  useEffect(() => {
    if (username) {
      dispatch(fetchFriends(username));
    }
  }, [dispatch, username]);

  if (loading) {
    return <div className="p-4 pt-0">Loading...</div>;
  }

  return (
    <div className="p-4 pt-0">
      <p className="text-sm font-bold text-black">Friends</p>
      <div className="mt-2">
        {friends.map((friend) => (
          <div key={friend.username} className="row text-sm text-black mb-2">
            <div className="flex items-center">
              <div className="flex rounded-full w-8 h-8 bg-gradient-to-br from-dark2 to-light1 relative">
                <div className="m-auto">
                  {friend.profilePicture ? (
                    <img 
                      src={friend.profilePicture} 
                      alt={friend.username}
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        toast.error(`Failed to load ${friend.username}'s profile picture`);
                      }}
                    />
                  ) : (
                    <UserRound className="m-auto h-6 w-6"/>
                  )}
                </div>
              </div>
              <span className="ml-2">{friend.username}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Friends;
