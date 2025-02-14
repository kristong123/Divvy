import { UserRoundPlus, UsersRound, Bell } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { useState, useEffect } from 'react';
import Notifications from './Notifications';
import Friends from './Friends';
import Requests from './Requests';
import { setupFriendsListeners } from '../store/slice/friendsSlice';
import ProfilePicture from './ProfilePicture';

const Sidebar: React.FC = () => {
  const username = useSelector((state: RootState) => state.user.username);
  const dispatch = useDispatch<AppDispatch>();
  const [activeSection, setActiveSection] = useState<'notifications' | 'friends' | 'requests'>('friends');

  useEffect(() => {
    if (username) {
      dispatch(setupFriendsListeners(username)).then(cleanup => {
        return () => {
          if (cleanup) cleanup();
        };
      });
    }
  }, [dispatch, username]);

  return (
    <div className='row'>
      <div className='w-60'>
        <div className='col h-fit'>
          <div className='row p-4'>
            <ProfilePicture />
            <p className='ml-4 my-auto text-2xl font-bold text-black'>
              {username || 'Guest'}
            </p> 
          </div>
          <div className='h-0.5 bg-gradient-to-l from-black to-white'></div>
          <div className='row py-3'>
            <button 
              onClick={() => setActiveSection('notifications')}
              className="m-auto transition-all duration-300 ease-smooth hover:scale-110"
            >
              <Bell className={`h-8 w-8 ${activeSection === 'notifications' ? 'stroke-dark1' : 'stroke-black'}
                transition-colors duration-300 ease-smooth`}/>
            </button>
            <button 
              onClick={() => setActiveSection('friends')}
              className="m-auto transition-all duration-300 ease-smooth hover:scale-110"
            >
              <UsersRound className={`h-8 w-8 ${activeSection === 'friends' ? 'stroke-dark1' : 'stroke-black'}
                transition-colors duration-300 ease-smooth`}/>
            </button>
            <button 
              onClick={() => setActiveSection('requests')}
              className="m-auto transition-all duration-300 ease-smooth hover:scale-110"
            >
              <UserRoundPlus className={`h-8 w-8 ${activeSection === 'requests' ? 'stroke-dark1' : 'stroke-black'}
                transition-colors duration-300 ease-smooth`}/>
            </button>
          </div>
          <div>
            <div className={`${activeSection === 'notifications' ? 'opacity-100' : 'opacity-0 hidden'} 
              transition-opacity duration-300 ease-smooth`}>
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
      <div className='w-0.5 bg-gradient-to-b from-black to-white'></div>
    </div>
  );
};

export default Sidebar;