import React, { useRef } from 'react';
import { UserRound } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { updateProfilePicture } from '../store/slice/userSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';

const ProfilePicture: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username, profilePicture } = useSelector((state: RootState) => state.user);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading toast
    const loadingToast = toast.loading('Uploading profile picture...');

    try {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('Image is too large. Maximum size is 5MB', {
          id: loadingToast
        });
        return;
      }

      // Compress the image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        onProgress: (progress) => {
          toast.loading(`Compressing: ${Math.round(progress)}%`, {
            id: loadingToast
          });
        }
      });

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        try {
          const response = await axios.post(
            `${BASE_URL}/user/profile-picture`,
            {
              image: base64,
              username: username
            }
          );
          
          dispatch(updateProfilePicture(response.data.url));
          toast.success('Profile picture updated successfully!', {
            id: loadingToast
          });
        } catch (error) {
          console.error('Error uploading profile picture:', error);
          toast.error('Failed to upload profile picture', {
            id: loadingToast
          });
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to compress image.', {
        id: loadingToast
      });
    }
  };

  return (
    <div 
      className='flex rounded-full w-16 h-16 bg-gradient-to-br from-dark2 to-light1 relative cursor-pointer group'
      onClick={handleClick}
    >
      <div className="m-auto">
        {profilePicture ? (
          <img 
            src={profilePicture} 
            alt="Profile"
            className="w-14 h-14 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = ''; // Clear the broken image
              toast.error('Failed to load profile picture');
            }}
          />
        ) : (
          <div className="flex rounded-full w-14 h-14 bg-slate-300">
            <UserRound className="m-auto w-3/4 h-3/4"/>
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs">Edit</span>
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