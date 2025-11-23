/**
 * AuthContext
 * This file manages authentication (login, logout, register) for the app.
 * It uses React Context to share user information across all components.
 *
 * Features:
 *  - Stores user info and login state.
 *  - Provides login, logout, and register functions (mocked for testing).
 *  - Saves session data in localStorage so it persists after refresh.
 *  - Creates temporary mock users if login username is not found.
 *
 * @returns AuthProvider component that wraps the app and provides authentication context.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import mockUsers from '../data/users.json'; // Fake user data for testing

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component that wraps the app
export const AuthProvider = ({ children }) => {
  // State variables for authentication
  const [user, setUser] = useState(null);           // Current logged-in user
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Login status
  const [loading, setLoading] = useState(true);     // Loading state while checking localStorage

  // Check localStorage for saved session on first load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData)); // Restore user
      setIsAuthenticated(true);      // Mark as logged in
    }
    setLoading(false); // Done checking
  }, []);

  // Mock login function (always succeeds)
  const login = async (username, password) => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Fake delay

    let userFound = mockUsers.find(u => u.username === username);

    // If user not found, create a temporary mock user
    if (!userFound) {
      console.log(`[MOCK] Creating temporary user profile for: ${username}`);
      userFound = {
        id: Date.now(),
        username: username,
        name: username.charAt(0).toUpperCase() + username.slice(1), 
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1abc9c&color=fff`
      };
    }

    // Fake token for mock login
    const token = 'local-mock-token';

    // Store user without password
    const userToStore = { ...userFound };
    delete userToStore.password; 

    // Update state and localStorage
    setUser(userToStore);
    setIsAuthenticated(true);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userToStore));
    
    return { success: true, message: 'Login successful' };
  };

  // Mock register function (not implemented)
  const register = async (userData) => { /* ... mock implementation ... */ };

  // Logout function clears user and localStorage
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Value provided to all components
  const value = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    loading
  };

  // Wrap children with AuthContext provider
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
