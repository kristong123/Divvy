import { UserRoundPlus, UsersRound, Bell, Home } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import NotificationsPanel from './sidebar/Notifications';
import Friends from './sidebar/Friends';
import Requests from './sidebar/Requests';
import { setupFriendsListeners } from '../store/slice/friendsSlice';
import ProfilePicture from './sidebar/ProfilePicture';
import VenmoUsernameEditor from './sidebar/VenmoUsernameEditor';

interface SidebarProps {
  onChatSelect: (chatId: string, notificationType?: string) => void;
  onHomeClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onChatSelect, onHomeClick }) => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const dispatch = useDispatch<AppDispatch>();
  const [activeSection, setActiveSection] = useState<'notifications' | 'friends' | 'requests'>('friends');
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);
  const groups = useSelector((state: RootState) => state.groups.groups);

  const container = clsx(
    // Layout
    'flex flex-row'
  );

  const sidebar = clsx(
    // Layout
    'w-60',
    // Border
    'border-r'
  );

  const profileSection = clsx(
    // Layout
    'flex flex-col h-fit'
  );

  const userInfo = clsx(
    // Layout
    'flex flex-col',
    // Spacing
    'p-4',
    // Border
    'border-b'
  );

  const userInfoRow = clsx(
    // Layout
    'flex flex-row',
    // Spacing
    'mb-1'
  );

  const usernameStyle = clsx(
    // Layout
    'ml-4',
    // Typography
    'text-2xl font-bold text-black'
  );

  const navigationButtons = clsx(
    // Layout
    'flex flex-row',
    // Spacing
    'py-3'
  );

  const navButton = clsx(
    // Layout
    'm-auto',
    // Transitions
    'transition-all duration-300 ease-smooth',
    // Hover
    'hover:scale-110'
  );

  const navIcon = (isActive: boolean) => clsx(
    // Size
    'h-8 w-8',
    // Color
    isActive ? 'stroke-dark1' : 'stroke-black',
    // Transitions
    'transition-colors duration-300 ease-smooth'
  );

  const sectionTransition = (isVisible: boolean) => clsx(
    // Visibility
    isVisible ? 'opacity-100' : 'opacity-0 hidden',
    // Transitions
    'transition-opacity duration-300 ease-smooth'
  );

  const homeButton = clsx(
    // Position
    'absolute bottom-4 left-4',
    // Layout
    'p-2 rounded-full',
    // Appearance
    'bg-gradient-to-tr from-[#57E3DC] to-white',
    // Interactive
    'cursor-pointer hover:scale-110',
    // Transitions
    'transition-transform duration-300'
  );

  useEffect(() => {
    if (currentUser) {
      let cleanup: (() => void) | undefined;
      
      dispatch(setupFriendsListeners(currentUser))
        .then(cleanupFn => {
          cleanup = cleanupFn;
        });
      
      return () => {
          cleanup?.();
      };
    }
  }, [dispatch, currentUser]);

  const handleNotificationClick = (groupId: string, notificationType?: string) => {
    const group = groups[groupId];
    
    if (group) {
      setActiveSection('notifications');
      
      setTimeout(() => {
        onChatSelect(groupId, notificationType);
      }, 100);
    }
  };

  return (
    <div className={container}>
      <div className={sidebar}>
        <div className={profileSection}>
          <div className={userInfo}>
            <div className={userInfoRow}>
              <ProfilePicture />
              <div className="flex flex-col my-auto">
                <p className={usernameStyle}>
                  {currentUser || 'Guest'}
                </p>
                <VenmoUsernameEditor />
              </div>
            </div>
          </div>
          <div className={navigationButtons}>
            <button 
              onClick={() => setActiveSection('notifications')}
              className={navButton}
              aria-label="Notifications"
            >
              <div className="relative">
                <Bell className={navIcon(activeSection === 'notifications')}/>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-dark1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveSection('friends')}
              className={navButton}
            >
              <UsersRound className={navIcon(activeSection === 'friends')}/>
            </button>
            <button 
              onClick={() => setActiveSection('requests')}
              className={navButton}
            >
              <UserRoundPlus className={navIcon(activeSection === 'requests')}/>
            </button>
          </div>
          <div>
            <div className={sectionTransition(activeSection === 'notifications')}>
              <NotificationsPanel onNotificationClick={handleNotificationClick} />
            </div>
            <div className={activeSection === 'friends' ? '' : 'hidden'}>
              <Friends onChatSelect={onChatSelect} />
            </div>
            <div className={activeSection === 'requests' ? '' : 'hidden'}>
              <Requests />
            </div>
          </div>
        </div>
      </div>
      <button 
        className={homeButton}
        onClick={onHomeClick}
      >
        <Home className="h-6 w-6 text-black" />
      </button>
    </div>
  );
};

export default Sidebar;