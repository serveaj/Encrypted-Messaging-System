import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// The base URL for all API calls
const API_URL = process.env.REACT_APP_API_URL;

// Create the authentication context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);  // The logged-in user's info
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Are they logged in?
  const [loading, setLoading]             = useState(true);  // Still checking localStorage?

  const navigate = useNavigate();

  // Restore session from local storage
  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

  // Login
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Tell server we're sending JSON
        body: JSON.stringify({ username, password }),     // Convert the object to a JSON string
      });

      // Parse the JSON response the server sends back
      const data = await response.json();

      if (data.success) {
        // Save user info and token in state + localStorage
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard'); // Redirect to the chat dashboard
      }

      // Return the full response so Login.jsx can show error messages if needed
      return data;

    } catch (err) {
      // This catches network errors
      console.error('[Auth] Login fetch failed:', err);
      return {
        success: false,
        message: 'Could not connect to the server. Make sure the backend is running.'
      };
    }
  };

  // Registration
  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      }

      return data;

    } catch (err) {
      console.error('[Auth] Register fetch failed:', err);
      return {
        success: false,
        message: 'Could not connect to the server. Make sure the backend is running.'
      };
    }
  };

  // Profile update for changing display name
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Logout
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/'); // Go back to the landing page
  };

  const value = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
