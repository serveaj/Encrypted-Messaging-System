/**
 * Register Component
 * - Shows a registration form inside a styled card
 * - Validates password match and minimum length
 * - Has a show/hide toggle for password field
 * - Confirm password follows the same visibility state
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './utils/AuthContext';
import './Register.css';

// Eye icons for show/hide password
import hideIcon from './assets/Logos/hide.png';
import unhideIcon from './assets/Logos/unhide.png';

const Register = () => {
  // Form input values
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false); // controls visibility of both password fields
  const [error, setError] = useState('');                  // error message text
  const [loading, setLoading] = useState(false);           // disables inputs while submitting

  const { register } = useAuth();                          // register function from context
  const navigate = useNavigate();                          // navigation hook

  // Update formData when user types
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check minimum password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    // Exclude confirmPassword before sending
    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);

    // Navigate or show error
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="register-page-container">
      <div className="register-card-wrapper">
        <div className="register-card">
          {/* Title and subtitle */}
          <h2 className="register-title">Create Account</h2>
          <p>Join SecureComm for encrypted messaging</p>

          {/* Error message */}
          {error && <div className="register-error">{error}</div>}

          {/* Registration form */}
          <form className="register-form" onSubmit={handleSubmit}>
            {/* Full name field */}
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>

            {/* Email field */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            {/* Username field */}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                disabled={loading}
              />
            </div>

            {/* Password field with show/hide icon */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <img
                    src={showPassword ? hideIcon : unhideIcon}
                    alt={showPassword ? 'Hide password' : 'Show password'}
                  />
                </button>
              </div>
            </div>

            {/* Confirm password field (follows same show/hide state) */}
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>

            {/* Submit button */}
            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer link to login */}
          <p className="register-footer">
            Already have an account? <Link to="/login">Login Here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
