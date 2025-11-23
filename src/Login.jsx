/**
 * Login Component
 * This component shows a login form where a user can type their username and password.
 * It checks if the login is correct and then moves the user to the dashboard page.
 *
 * @returns JSX The login form with inputs, error messages, and navigation links.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation after login
import { useAuth } from './utils/AuthContext'; // Custom authentication context
import './Login.css'; // Styles for the login page

// Import logos
import hideIcon from './assets/Logos/hide.png';
import unhideIcon from './assets/Logos/unhide.png';

// Login component definition
const Login = () => {
  // State variables for form inputs and error handling
  const [username, setUsername] = useState(''); // Stores the entered username/email
  const [password, setPassword] = useState(''); // Stores the entered password
  const [error, setError] = useState('');       // Stores error messages to display
  const [showPassword, setShowPassword] = useState(false); // For custom password visibility toggle

  const navigate = useNavigate(); // Hook to programmatically navigate between routes
  const { login } = useAuth();    // Access the login function from AuthContext

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission (page reload)
    setError('');       // Clear any previous error messages

    // Basic validation: check if both fields are filled
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      // Call the login function from AuthContext with entered credentials
      const response = await login(username, password);

      if (response.success) {
        // If login is successful, redirect user to dashboard
        navigate('/dashboard');
      } else {
        // If login fails, show error message from response or fallback text
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      // Catch unexpected errors (e.g., network issues)
      console.error("Login error:", err);
      setError('An unexpected error occurred during login.');
    }
  };

  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page-container">
      {/* Wrapper for the animated login card */}
      <div className="login-card-wrapper"> 
        <div className="login-card">
          {/* Page title */}
          <h2 className="login-title">Login</h2>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="login-form">
            
            {/* Username input field */}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text" // Changed from email to text for broader username support
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)} // Update state on change
                placeholder="Enter your username"
                required
              />
            </div>

            {/* Password input field with toggle */}
            <div className="input-group password-input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // Update state on change
                  placeholder="Enter your password"
                  required
                />
                {/* Password visibility toggle button */}
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <img 
                    src={showPassword ? hideIcon : unhideIcon} 
                    alt={showPassword ? "Hide password" : "Show password"}
                    className="password-toggle-icon"
                  />
                </button>
              </div>
            </div>

            {/* Display error message if login fails */}
            {error && <p className="login-error">{error}</p>}

            {/* Links for additional actions */}
            <div className="login-actions">
              <a href="/forgot-password" className="action-link">Forgot Password</a>
              <a href="/register" className="action-link">Sign Up</a>
            </div>

            {/* Submit button */}
            <button type="submit" className="login-btn">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Export the component so it can be used in other parts of the app
export default Login;