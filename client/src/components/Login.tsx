import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    alert('Logged in!');
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
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-light1"
            placeholder="Enter your username"
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-light1 pr-10"
              placeholder="Enter your password"
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
          onClick={handleLogin} // Add onClick handler for login
          className="w-full bg-dark2 text-white py-2 rounded-lg hover:shadow-md transition duration-300"
        >
          Log In
        </button>

        <button className="text-white font-bold mt-3">
          Sign up
        </button>
      </div>
    </div>
  );
};

export default Login;