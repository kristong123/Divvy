import React from 'react';

interface VenmoIconProps {
  size?: number;
  color?: string;
  className?: string;
}

const VenmoIcon: React.FC<VenmoIconProps> = ({ 
  size = 16, 
  color = '#3D95CE',
  className = ''
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 512 512" 
    className={className}
  >
    <path
      fill={color}
      d="M444.17 32H70.28C49.85 32 32 46.7 32 66.89V441.6c0 20.31 17.85 38.4 38.28 38.4h373.78c20.54 0 35.94-18.2 35.94-38.39V66.89C480.12 46.7 464.6 32 444.17 32zM278 387H174.32l-41.57-248.56 90.75-8.62 22 176.87c20.53-33.45 45.88-86 45.88-121.87 0-19.62-3.36-33-8.61-44l82.63-16.72c9.56 15.78 13.86 32 13.86 52.57-.01 65.5-55.92 150.59-101.26 210.33z"
    />
  </svg>
);

export default VenmoIcon; 