import React, { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import axios from "axios";
import clsx from "clsx";
import { useAppDispatch } from "../store/hooks"; // Type-safe dispatch
import { useNavigate } from "react-router-dom"; // Add this
import { BASE_URL } from "../config/api";
import { toast } from "react-hot-toast";
import { login } from "../services/auth";
import { useEnterKeyHandler } from "../utils/keyboardUtils";
import { useTheme } from "../context/ThemeContext"; // Import the ThemeContext

const Login: React.FC = () => {
  const { theme } = useTheme(); // Use the theme context
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // Log login attempt with emoji for better visibility
      console.log(`🔑 Login attempt for user: ${username}`);

      await login(username, password, dispatch);

      // Log successful login
      console.log(`✅ User logged in successfully: ${username}`);

      // Navigate to dashboard on successful login
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Validation
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    if (!password.trim()) {
      toast.error("Password cannot be empty");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/api/auth/signup`, {
        username,
        password,
      });
      toast.success("Account created! Please log in");
    } catch (_error) {
      console.error("Sign up failed:", _error);
      toast.error("Sign up failed");
    }
  };

  // Use our custom hook for Enter key handling (login only)
  useEnterKeyHandler(
    true,
    () => {
      if (!loading) {
        handleLogin();
      }
    },
    loading
  );

  const container = clsx(
    // Layout
    "col min-h-screen",
    // Alignment
    "items-center justify-center",
    // Typography
    "text-black"
  );

  const formContainer = clsx(
    // Layout
    "col",
    // Alignment
    "justify-center"
  );

  const title = clsx(
    // Typography
    "text-4xl font-bold text-white text-center",
    // Spacing
    "mb-4"
  );

  const inputLabel = clsx(
    // Typography
    "block text-white text-sm font-bold",
    // Spacing
    "mb-2"
  );

  const baseInput = clsx(
    // Layout
    "w-full",
    // Spacing
    "px-3 py-2",
    // Border
    "border rounded-lg",
    // Focus
    "focus:outline-none focus:ring-2 focus:ring-light1",
    // Transitions
    "transition-all duration-300 ease-smooth",
    // Hover
    "hover:border-dark2"
  );

  const passwordContainer = clsx(
    // Layout
    "relative",
    // Spacing
    "mb-6"
  );

  const passwordToggle = clsx(
    // Position
    "absolute inset-y-0 right-0 px-3",
    // Layout
    "flex items-center",
    // Typography
    "text-gray-600",
    // Hover
    "hover:text-gray-800"
  );

  const loginButton = clsx(
    // Layout
    "w-full",
    // Spacing
    "py-2",
    // Appearance
    "bg-dark2 text-white rounded-lg",
    // Effects
    "hover:shadow-md",
    // Transitions
    "transition-all duration-300 ease-smooth"
  );

  const signupButton = clsx(
    // Typography
    "text-white font-bold",
    // Spacing
    "mt-3",
    // Transitions
    "transition-all duration-300 ease-smooth"
  );

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${theme === "dark" ? "bg-gray-900 text-white" : "bg-[#68d8d6] text-black"}`}>
      <div className={container}>
        <div className={formContainer}>
          <h1 className={title}>Divvy</h1>

          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="username" className={inputLabel}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={baseInput}
              placeholder="Enter your username"
            />
          </div>

          <div className={passwordContainer}>
            <label htmlFor="password" className={inputLabel}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={clsx(baseInput, "pr-10")}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={passwordToggle}
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
            className={loginButton}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <button onClick={handleSignUp} className={signupButton}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
