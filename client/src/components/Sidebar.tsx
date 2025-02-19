import { UserRoundPlus, UsersRound, Bell, Home } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import Notifications from './sidebar/Notifications';
import Friends from './sidebar/Friends';
import Requests from './sidebar/Requests';
import { setupFriendsListeners } from '../store/slice/friendsSlice';
import ProfilePicture from './sidebar/ProfilePicture';

interface SidebarProps {
  onChatSelect: (chatId: string) => void;
  onHomeClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onChatSelect, onHomeClick }) => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const dispatch = useDispatch<AppDispatch>();
  const [activeSection, setActiveSection] = useState<'notifications' | 'friends' | 'requests'>('friends');

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
    'flex flex-row',
    // Spacing
    'p-4',
    // Border
    'border-b'
  );

  const usernameStyle = clsx(
    // Layout
    'ml-4 my-auto',
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

  return (
    <div className={container}>
      <div className={sidebar}>
        <div className={profileSection}>
          <div className={userInfo}>
            <ProfilePicture />
            <p className={usernameStyle}>
              {currentUser || 'Guest'}
            </p> 
          </div>
          <div className={navigationButtons}>
            <button 
              onClick={() => setActiveSection('notifications')}
              className={navButton}
            >
              <Bell className={navIcon(activeSection === 'notifications')}/>
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
              <Notifications />
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