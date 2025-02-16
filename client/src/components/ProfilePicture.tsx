import React, { useRef } from 'react';
import { UserRound } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '../store/store';
import { updateProfilePicture } from '../store/slice/userSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { toast } from 'react-hot-toast';

const ProfilePicture: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username, profilePicture } = useSelector((state: RootState) => state.user);

  const container = clsx(
    // Layout
    'flex rounded-full w-16 h-16',
    // Appearance
    'bg-gradient-to-br from-dark2 to-light1',
    // Position
    'relative',
    // Interactive
    'cursor-pointer',
    // Group
    'group'
  );

  const innerContainer = clsx(
    // Layout
    'm-auto'
  );

  const defaultAvatar = clsx(
    // Layout
    'flex rounded-full w-14 h-14',
    // Appearance
    'bg-slate-300'
  );

  const defaultIcon = clsx(
    // Layout
    'm-auto w-3/4 h-3/4'
  );

  const profileImage = clsx(
    // Layout
    'w-14 h-14',
    // Appearance
    'rounded-full object-cover'
  );

  const overlay = clsx(
    // Layout
    'absolute inset-0',
    // Appearance
    'bg-black bg-opacity-50 rounded-full',
    // Visibility
    'opacity-0 group-hover:opacity-100',
    // Layout
    'flex items-center justify-center',
    // Transitions
    'transition-opacity'
  );

  const overlayText = clsx(
    // Typography
    'text-white text-xs'
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Uploading profile picture...');

    try {
      // Send only the file data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('username', username || '');

      const response = await axios.post(
        `${BASE_URL}/user/profile-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      dispatch(updateProfilePicture(response.data.url));
      toast.success('Profile picture updated!', {
        id: loadingToast
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image', {
        id: loadingToast
      });
    }
  };

  return (
    <div className={container} onClick={handleClick}>
      <div className={innerContainer}>
        {profilePicture ? (
          <img 
            src={profilePicture} 
            alt="Profile"
            className={profileImage}
            onError={(e) => {
              e.currentTarget.src = ''; // Clear the broken image
              toast.error('Failed to load profile picture');
            }}
          />
        ) : (
          <div className={defaultAvatar}>
            <UserRound className={defaultIcon}/>
          </div>
        )}
        <div className={overlay}>
          <span className={overlayText}>Edit</span>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ProfilePicture;