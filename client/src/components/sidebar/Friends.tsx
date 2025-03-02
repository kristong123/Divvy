import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '../../store/store';
import { fetchFriends } from '../../store/slice/friendsSlice';
import { AppDispatch } from '../../store/store';
import ProfileAvatar from '../shared/ProfileAvatar';

interface FriendsProps {
  onChatSelect: (chatId: string) => void;
}

const Friends: React.FC<FriendsProps> = ({ onChatSelect }) => {
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
    'mt-2',
    // Height and overflow
    'max-h-[calc(100vh-250px)]',
    'overflow-y-auto',
    // Scrollbar styling
    'scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent'
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
          <div 
            key={friend.username} 
            className={clsx(friendItem, 'cursor-pointer')}
            onClick={() => onChatSelect(friend.username)}
          >
            <div className={avatarContainer}>
              <ProfileAvatar
                username={friend.username}
                size={32}
              />
              <span className={friendName}>{friend.username}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Friends;
