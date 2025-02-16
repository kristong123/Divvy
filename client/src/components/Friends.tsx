import { UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '../store/store';
import { fetchFriends } from '../store/slice/friendsSlice';
import { AppDispatch } from '../store/store';
import { toast } from 'react-hot-toast';

const Friends: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.user.username);
  const friends = useSelector((state: RootState) => state.friends.friends);
  const loading = useSelector((state: RootState) => state.friends.loading);

  const container = clsx(
    // Spacing
    'p-4 pt-0'
  );

  const title = clsx(
    // Typography
    'text-sm font-bold text-black'
  );

  const friendsList = clsx(
    // Spacing
    'mt-2'
  );

  const friendItem = clsx(
    // Layout
    'row',
    // Typography
    'text-sm text-black',
    // Spacing
    'mb-2'
  );

  const avatarContainer = clsx(
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

  const friendName = clsx(
    // Spacing
    'ml-2'
  );

  useEffect(() => {
    if (username) {
      dispatch(fetchFriends(username));
    }
  }, [dispatch, username]);

  if (loading) {
    return <div className={container}>Loading...</div>;
  }

  return (
    <div className={container}>
      <p className={title}>Friends</p>
      <div className={friendsList}>
        {friends.map((friend) => (
          <div key={friend.username} className={friendItem}>
            <div className={avatarContainer}>
              <div className={avatarWrapper}>
                <div className={avatarInner}>
                  {friend.profilePicture ? (
                    <img 
                      src={friend.profilePicture} 
                      alt={friend.username}
                      className={profileImage}
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
              <span className={friendName}>{friend.username}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Friends;
