import React from 'react';
import Sidebar from './Sidebar';

const Dashboard: React.FC = () => {
  return (
    <div className="row w-screen h-screen bg-white">
      <Sidebar/>
      <h1 className='text-5xl font-bold text-dark1'>Divvy</h1>
    </div>
  )
};

export default Dashboard;