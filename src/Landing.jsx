/**
 * Landing.jsx
 * This component is the landing page for the app. It shows a hero section with a product preview and links to login/register.
 *
 * Features:
 * - Redirects to dashboard if user is already authenticated.
 * - Displays a hero section with a headline, description, and call-to-action buttons.
 * - Shows a preview of the messaging interface to entice users to sign up.
 *
 * @returns JSX The landing page content.
 */

import React from 'react';
import { Link, Navigate } from 'react-router-dom'; // For navigation between pages
import { useAuth } from './utils/AuthContext'; // Custom hook to access authentication context
import './Landing.css'; // Styles specific to the landing page

/* Landing page component */
const Landing = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-brand">
          <span className="landing-brand__mark">SC</span>
          <span className="landing-brand__name">SecureComm</span>
        </div>
        <nav className="landing-nav" aria-label="Primary">
          <Link to="/login" className="landing-nav__link">Sign In</Link>
          <Link to="/register" className="landing-nav__cta">Get Started</Link>
        </nav>
      </header>

      <main className="landing-hero">
        <section className="landing-copy">
          <span className="landing-eyebrow">Private messaging, cleaner workflow</span>
          <h1>Conversations that stay focused, fast, and protected.</h1>
          <p>
            SecureComm gives teams and individuals a modern messaging space with
            direct chats, group conversations, and a streamlined interface built
            for secure communication.
          </p>
          <div className="landing-actions">
            <Link to="/register" className="landing-button landing-button--primary">
              Create Account
            </Link>
            <Link to="/login" className="landing-button landing-button--secondary">
              Sign In
            </Link>
          </div>
        </section>

        <section className="landing-preview" aria-label="Product preview">
          <div className="preview-card">
            <div className="preview-card__top">
              <div>
                <p className="preview-label">Live workspace</p>
                <h2>Team Alpha</h2>
              </div>
              <span className="preview-pill">Encrypted</span>
            </div>

            <div className="preview-thread-list">
              <div className="preview-thread preview-thread--active">
                <strong>Product Design</strong>
                <span>Latest mockups are ready for review.</span>
              </div>
              <div className="preview-thread">
                <strong>Engineering</strong>
                <span>Deployment window confirmed for Friday.</span>
              </div>
              <div className="preview-thread">
                <strong>Direct Message</strong>
                <span>Can you review the onboarding copy?</span>
              </div>
            </div>

            <div className="preview-message-panel">
              <div className="preview-message preview-message--received">
                Shared the release checklist in the project group.
              </div>
              <div className="preview-message preview-message--sent">
                Looks good. I’ll handle the final sign-off.
              </div>
              <div className="preview-composer">
                <span>Type a secure message...</span>
                <button type="button">Send</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
