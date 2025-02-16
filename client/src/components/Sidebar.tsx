import { UserRoundPlus, UsersRound, Bell } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import Notifications from './Notifications';
import Friends from './Friends';
import Requests from './Requests';
import { setupFriendsListeners } from '../store/slice/friendsSlice';
import ProfilePicture from './ProfilePicture';

const Sidebar: React.FC = () => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const dispatch = useDispatch<AppDispatch>();
  const [activeSection, setActiveSection] = useState<'notifications' | 'friends' | 'requests'>('friends');

  const container = clsx(
    // Layout
    'flex flex-row'
  );

  const sidebar = clsx(
    // Layout
    'w-60'
  );

  const profileSection = clsx(
    // Layout
    'flex flex-col h-fit'
  );

  const userInfo = clsx(
    // Layout
    'flex flex-row',
    // Spacing
    'p-4'
  );

  const usernameStyle = clsx(
    // Layout
    'ml-4 my-auto',
    // Typography
    'text-2xl font-bold text-black'
  );

  const divider = clsx(
    // Layout
    'h-0.5',
    // Appearance
    'bg-gradient-to-l from-black to-white'
  );

  const verticalDivider = clsx(
    // Layout
    'w-0.5',
    // Appearance
    'bg-gradient-to-b from-black to-white'
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

  useEffect(() => {
    if (currentUser) {
      dispatch(setupFriendsListeners(currentUser)).then(cleanup => {
        return () => {
          if (cleanup) cleanup();
        };
      });
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
          <div className={divider}></div>
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
              <Friends />
            </div>
            <div className={activeSection === 'requests' ? '' : 'hidden'}>
              <Requests />
            </div>
          </div>
        </div>
      </div>
      <div className={verticalDivider}></div>
    </div>
  );
};

export default Sidebar;