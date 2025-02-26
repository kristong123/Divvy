import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import clsx from "clsx";
import { markNotificationAsRead } from "../../store/slice/notificationsSlice";
import { clearAllNotifications } from "../../services/socketService";
import ProfileAvatar from "../shared/ProfileAvatar";
import { formatDistanceToNow } from "date-fns";
import { fetchUserNotifications } from "../../services/socketService";

interface NotificationsPanelProps {
  onNotificationClick?: (groupId: string, notificationType?: string) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  onNotificationClick,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const notifications = useSelector(
    (state: RootState) => state.notifications.notifications
  );
  const currentUser = useSelector((state: RootState) => state.user.username);

  const container = clsx(
    // Spacing
    "p-4 pt-0",
    // Layout
    "flex-1 overflow-y-auto",
    // Height - make it responsive to parent container
    "h-full max-h-[calc(100vh-250px)]",
    // Scrollbar styling
    "scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
  );

  const title = clsx(
    // Typography
    "text-sm font-bold text-black",
    // Spacing
    "ml-4 mb-2 flex gap-5 items-center"
  );

  const notificationItem = clsx(
    // Layout
    "flex flex-col",
    // Spacing
    "p-3 mb-2",
    // Appearance
    "bg-[#E7FCFB] rounded-lg shadow-sm",
    // Border
    "border-l-4 border-dark1",
    // Font weight for unread
    "font-semibold",
    // Text color for unread
    "text-black",
    // Interactive
    "cursor-pointer hover:bg-opacity-90"
  );

  const notificationRead = clsx(
    // Layout
    "flex flex-col",
    // Spacing
    "p-3 mb-2",
    // Appearance
    "bg-gray-100 rounded-lg shadow-sm",
    // Border
    "border-l-4 border-gray-300",
    // Font weight for read
    "font-normal",
    // Text color for read
    "text-gray-600",
    // Interactive
    "cursor-pointer hover:bg-gray-50"
  );

  const notificationHeader = clsx(
    // Layout
    "flex items-center",
    // Spacing
    "mb-1"
  );

  const notificationTitle = clsx(
    // Typography
    "text-sm font-medium text-black",
    // Spacing
    "ml-2"
  );

  const notificationMessage = clsx(
    // Typography
    "text-sm text-gray-600"
  );

  const notificationTime = clsx(
    // Typography
    "text-xs text-gray-400",
    // Spacing
    "mt-1"
  );

  const emptyState = clsx(
    // Layout
    "flex flex-col items-center justify-center",
    // Spacing
    "py-6",
    // Typography
    "text-gray-500 text-sm"
  );

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      window.localStorage.setItem("lastClickedNotificationId", notification.id);

      dispatch(
        markNotificationAsRead({
          username: currentUser,
          notificationId: notification.id,
        })
      );
    }

    if (notification.data?.groupId && onNotificationClick) {
      onNotificationClick(notification.data.groupId, notification.type);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(clearAllNotifications(currentUser));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return "recently";
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserNotifications(currentUser);
    }
  }, [currentUser]);

  return (
    <div>
      <div className={title}>
        <span>Notifications</span>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-500 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className={container}>
        {notifications.length === 0 ? (
          <div className={emptyState}>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const isRead =
              notification.read ||
              notification.id ===
                window.localStorage.getItem("lastClickedNotificationId");

            return (
              <div
                key={notification.id}
                className={isRead ? notificationRead : notificationItem}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={notificationHeader}>
                  {notification.data?.senderProfile && (
                    <ProfileAvatar
                      username={notification.data.sender || "User"}
                      imageUrl={notification.data.senderProfile}
                      size="sm"
                    />
                  )}
                  <span className={notificationTitle}>
                    {notification.title}
                  </span>
                </div>
                <p className={notificationMessage}>{notification.message}</p>
                <span className={notificationTime}>
                  {formatTimestamp(notification.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
