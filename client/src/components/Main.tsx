import React from 'react';
import Sidebar from './Sidebar';

const Dashboard: React.FC = () => {
  return (
    <div className="row w-screen h-screen bg-white">
      <Sidebar/>
      <div className='col w-full'>
        <h1 className='ml-96 mt-10 text-5xl font-bold text-dark1'>Divvy</h1>
        <div className='row flex-wrap'>
          
        </div>
      </div>
      
    </div>
  )
};

export default Dashboard;