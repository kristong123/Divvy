import { UserRoundPlus, UsersRound, Bell, Home } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { useState, useEffect } from "react";
import clsx from "clsx";
import NotificationsPanel from "./sidebar/Notifications";
import Friends from "./sidebar/Friends";
import Requests from "./sidebar/Requests";
import { setupFriendsListeners } from "../store/slice/friendsSlice";
import ProfilePicture from "./sidebar/ProfilePicture";
import VenmoUsernameEditor from "./sidebar/VenmoUsernameEditor";
import { useTheme } from "../context/ThemeContext"; // Import the ThemeContext
import FloatingButton from "./shared/FloatingButton";

interface SidebarProps {
  onChatSelect: (chatId: string, notificationType?: string) => void;
  onHomeClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onChatSelect, onHomeClick }) => {
  const { theme } = useTheme(); // Keep theme for styling, remove toggleTheme
  const currentUser = useSelector((state: RootState) => state.user.username);
  const dispatch = useDispatch<AppDispatch>();
  const [activeSection, setActiveSection] = useState<
    "notifications" | "friends" | "requests"
  >("friends");
  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );
  const groups = useSelector((state: RootState) => state.groups.groups);

  useEffect(() => {
    if (currentUser) {
      let cleanup: (() => void) | undefined;

      dispatch(setupFriendsListeners(currentUser)).then((cleanupFn) => {
        cleanup = cleanupFn;
      });

      return () => {
        cleanup?.();
      };
    }
  }, [dispatch, currentUser]);

  const handleNotificationClick = (
    groupId: string,
    notificationType?: string
  ) => {
    const group = groups[groupId];

    if (group) {
      setActiveSection("notifications");

      setTimeout(() => {
        onChatSelect(groupId, notificationType);
      }, 100);
    }
  };

  return (
    <div
      className={clsx(
        "flex flex-row",
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"
      )}
    >
      <div className="w-60 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col h-fit">
          {/* Profile Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center">
              <ProfilePicture />
              <div className="ml-4">
                <p className="text-2xl font-bold">{currentUser || "Guest"}</p>
                <VenmoUsernameEditor />
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-row py-3">
            <button
              onClick={() => setActiveSection("notifications")}
              className="m-auto transition-all duration-300 hover:scale-110"
              aria-label="Notifications"
            >
              <div className="relative">
                <Bell
                  className={clsx(
                    "h-8 w-8",
                    activeSection === "notifications"
                      ? "stroke-[#57E3DC]"
                      : theme === "dark"
                      ? "stroke-white"
                      : "stroke-black"
                  )}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#57E3DC] text-black text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveSection("friends")}
              className="m-auto transition-all duration-300 hover:scale-110"
            >
              <UsersRound
                className={clsx(
                  "h-8 w-8",
                  activeSection === "friends"
                    ? "stroke-[#57E3DC]"
                    : theme === "dark"
                    ? "stroke-white"
                    : "stroke-black"
                )}
              />
            </button>
            <button
              onClick={() => setActiveSection("requests")}
              className="m-auto transition-all duration-300 hover:scale-110"
            >
              <UserRoundPlus
                className={clsx(
                  "h-8 w-8",
                  activeSection === "requests"
                    ? "stroke-[#57E3DC]"
                    : theme === "dark"
                    ? "stroke-white"
                    : "stroke-black"
                )}
              />
            </button>
          </div>

          {/* Sections */}
          <div>
            <div
              className={clsx(
                activeSection === "notifications"
                  ? "opacity-100"
                  : "opacity-0 hidden",
                "transition-opacity duration-300"
              )}
            >
              <NotificationsPanel
                onNotificationClick={handleNotificationClick}
              />
            </div>
            <div className={activeSection === "friends" ? "" : "hidden"}>
              <Friends onChatSelect={onChatSelect} />
            </div>
            <div className={activeSection === "requests" ? "" : "hidden"}>
              <Requests />
            </div>
          </div>
        </div>
      </div>

      {/* Home Button */}
      <FloatingButton
        icon={<Home className="h-6 w-6 text-black" />}
        onClick={onHomeClick}
        position="bottom-left"
      />
    </div>
  );
};

export default Sidebar;
