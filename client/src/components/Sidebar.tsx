import { UserRound } from 'lucide-react';
import { useSelector } from 'react-redux'; // Import useSelector
import { RootState } from '../store/store'; // Import RootState to type the state

const Sidebar: React.FC = () => {
  // Access the username from the Redux store
  const username = useSelector((state: RootState) => state.user.username);

  return (
    <div>
      <div className="col justify-between p-4">
        <div className="col h-fit">
          <div>
            <div className="flex bg-gradient-to-br from-dark2 to-light1 rounded-full w-16 h-16">
              <UserRound className="m-auto w-12 h-12"/>
            </div>
            {/* Display the username from the Redux store */}
            <p>{username || 'Guest'}</p> {/* Fallback to 'Guest' if username is null */}
          </div>
          <div>
            {/* Other sidebar content */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;