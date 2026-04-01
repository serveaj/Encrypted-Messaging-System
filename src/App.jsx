/**
 * App Component
 * This is the main entry point of the application.
 * It sets up routing and authentication for the app.
 *
 * Features:
 *  - Provides authentication context to all components.
 *  - Defines routes for Login, Register, and Dashboard.
 *  - Protects the Dashboard route so only logged-in users can access it.
 *  - Redirects "/" to "/dashboard".
 *
 * @returns JSX The full app with authentication and routing.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './utils/AuthContext';
import Landing from './Landing';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import './index.css';

// ProtectedRoute checks if user is logged in before showing a page
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); // Get login status and loading state
  if (loading) return null; // Show nothing while checking localStorage
  return isAuthenticated ? children : <Navigate to="/login" />; // Redirect if not logged in
};

// AppContent holds all the routes
const App = () => {
  return (
      <div className="App">
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<Landing />} />

          {/* Login page */}
          <Route path="/login" element={<Login />} />

          {/* Register page */}
          <Route path="/register" element={<Register />} />

          {/* Dashboard page (protected) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Default route redirects to dashboard */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
  );
};

export default App;
