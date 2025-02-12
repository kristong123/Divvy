import { UserRound, UserRoundPlus, UsersRound, Bell } from 'lucide-react';
import { useSelector } from 'react-redux'; // Import useSelector
import { RootState } from '../store/store'; // Import RootState to type the state

const Sidebar: React.FC = () => {
  // Access the username from the Redux store
  const username = useSelector((state: RootState) => state.user.username);

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
            <Bell className='stroke-black m-auto h-10 w-10'/>
            <UsersRound className='stroke-black m-auto h-10 w-10'/>
            <UserRoundPlus className='stroke-black m-auto h-10 w-10'/>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className='w-0.5 bg-gradient-to-b from-black to-white'></div>
    </div>
  );
};

export default Sidebar;