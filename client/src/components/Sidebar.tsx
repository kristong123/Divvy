import { UserRound, UserRoundPlus, UsersRound, Bell } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { useState, useEffect } from 'react';
import Notifications from './Notifications';
import Friends from './Friends';
import Requests from './Requests';
import { fetchFriends, fetchPendingRequests, fetchSentRequests } from '../store/slice/friendsSlice';

const Sidebar: React.FC = () => {
  const username = useSelector((state: RootState) => state.user.username);
  const dispatch = useDispatch<AppDispatch>();
  const [activeSection, setActiveSection] = useState<'notifications' | 'friends' | 'requests'>('friends');

  useEffect(() => {
    if (username) {
      dispatch(fetchFriends(username));
      dispatch(fetchPendingRequests(username));
      dispatch(fetchSentRequests(username));
    }
  }, [dispatch, username]);

  return (
    <div className='row'>
      <div className='w-60'>
        <div className='col h-fit'>
          <div className='row p-4'>
            <div className='flex rounded-full w-16 h-16 bg-gradient-to-br from-dark2 to-light1'>
              <UserRound className='m-auto h-12 w-12'/>
            </div>
            <p className='ml-4 my-auto text-2xl font-bold text-black'>
              {username || 'Guest'}
            </p> 
          </div>
          <div className='h-0.5 bg-gradient-to-l from-black to-white'></div>
          <div className='row py-3'>
            <button 
              onClick={() => setActiveSection('notifications')}
              className='m-auto'
            >
              <Bell className={`h-8 w-8 ${activeSection === 'notifications' ? 'stroke-dark1' : 'stroke-black'}`}/>
            </button>
            <button 
              onClick={() => setActiveSection('friends')}
              className='m-auto'
            >
              <UsersRound className={`h-8 w-8 ${activeSection === 'friends' ? 'stroke-dark1' : 'stroke-black'}`}/>
            </button>
            <button 
              onClick={() => setActiveSection('requests')}
              className='m-auto'
            >
              <UserRoundPlus className={`h-8 w-8 ${activeSection === 'requests' ? 'stroke-dark1' : 'stroke-black'}`}/>
            </button>
          </div>
          <div>
            <div className={activeSection === 'notifications' ? '' : 'hidden'}>
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