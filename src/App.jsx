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
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import './index.css';

// ProtectedRoute checks if user is logged in before showing a page
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth(); // Get login status
  return isAuthenticated ? children : <Navigate to="/login" />; // Redirect if not logged in
};

// AppContent holds all the routes
const AppContent = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
};

// App wraps everything with AuthProvider so authentication works everywhere
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
