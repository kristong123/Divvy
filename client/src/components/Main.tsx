import React from 'react';
import Sidebar from './Sidebar';

const Dashboard: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-white">
      <Sidebar/>
      <h1>Dashboard</h1>
    </div>
  )
};

export default Dashboard;