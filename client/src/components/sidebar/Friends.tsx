import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import clsx from "clsx";
import { RootState } from "../../store/store";
import { fetchFriends } from "../../store/slice/friendsSlice";
import { AppDispatch } from "../../store/store";
import ProfileFrame from "../shared/ProfileFrame";
import { useTheme } from "../../context/ThemeContext";

interface FriendsProps {
  onChatSelect: (chatId: string) => void;
}

const Friends: React.FC<FriendsProps> = ({ onChatSelect }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.user.username);
  const friends = useSelector((state: RootState) => state.friends.friends);
  const loading = useSelector((state: RootState) => state.friends.loading);

  const title = clsx(
    // Typography
    "text-sm font-bold",
    theme === "dark" ? "text-white" : "text-black"
  );

  const friendsList = clsx(
    // Spacing
    "mt-2",
    // Height and overflow
    "max-h-[calc(100vh-250px)]",
    "overflow-y-auto",
    // Scrollbar styling
    theme === "dark"
      ? "scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      : "scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
  );

  const friendItem = clsx(
    // Layout
    "row",
    // Typography
    "text-sm",
    theme === "dark" ? "text-white" : "text-black",
    // Spacing
    "mb--1",
    // Hover effect
    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
    "rounded-lg p-2 transition-colors"
  );

  const avatarContainer = clsx(
    // Layout
    "flex items-center"
  );

  const friendName = clsx(
    // Spacing
    "ml-2"
  );

  useEffect(() => {
    if (username) {
      dispatch(fetchFriends(username));
    }
  }, [dispatch, username]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <p className={title}>Friends</p>
      <div className={friendsList}>
        {friends.map((friend) => (
          <div
            key={friend.username}
            className={clsx(friendItem, "cursor-pointer")}
            onClick={() => onChatSelect(friend.username)}
          >
            <div className={avatarContainer}>
              <ProfileFrame username={friend.username} size={32} />
              <span className={friendName}>{friend.username}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Friends;
