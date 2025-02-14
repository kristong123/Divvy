import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import axios from 'axios';
import { useAppDispatch } from '../store/hooks'; // Type-safe dispatch
import { setUser } from '../store/slice/userSlice';
import { useNavigate } from 'react-router-dom'; // Add this
import { BASE_URL } from '../config/api';
import { toast } from 'react-hot-toast';

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    try {
      const url = `${BASE_URL}/auth/login`;
      const response = await axios.post(url, {
        username,
        password,
      });
      dispatch(setUser({ 
        username: response.data.user.username,
        profilePicture: response.data.user.profilePicture 
      }));
      navigate('/dashboard');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Login failed');
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleSignUp = async () => {
    if(!username || !password){
      toast.error('Please enter both username and password');
      return;
    }
    if(username.includes(' ') || password.includes(' ')){
      toast.error('Username and password cannot contain spaces');
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/signup`, {
        username,
        password,
      });
      toast.success(response.data.message);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Sign-up failed');
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        handleSignUp();
      } else {
        handleLogin();
      }
    }
  };

  return (
    <div className="col items-center justify-center min-h-screen text-black">
      <div className="col justify-center">
        <h1 className="text-4xl font-bold text-center mb-4 text-white">
          Divvy
        </h1>

        <div className="mb-4">
          <label htmlFor="username" className="block text-white text-sm font-bold mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-light1 
              transition-all duration-300 ease-smooth hover:border-dark2"
            placeholder="Enter your username"
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="mb-6 relative">
          <label htmlFor="password" className="block text-white text-sm font-bold mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-light1 pr-10 
                transition-all duration-300 ease-smooth hover:border-dark2"
              placeholder="Enter your password"
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600 hover:text-gray-800"
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-dark2 text-white py-2 rounded-lg hover:shadow-md 
            transition-all duration-300 ease-smooth"
        >
          Log In
        </button>

        <button
          onClick={handleSignUp}
          className="text-white font-bold mt-3 
            transition-all duration-300 ease-smooth"
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default Login;