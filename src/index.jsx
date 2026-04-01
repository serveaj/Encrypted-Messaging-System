/**
 * index.js
 * This is the main entry file for the React app.
 * It tells the browser where to start running the app and 
 * connects the App component to the HTML page.
 *
 * Steps:
 * 1. Import React and ReactDOM (tools needed to run React in the browser).
 * 2. Import the main App component (the "home base" of the app).
 * 3. Import the CSS file for global styles.
 * 4. Find the "root" div in index.html (this is where React will show everything).
 * 5. Render the App component inside that root div.
 */

import React from 'react'; // React library for building UI
import ReactDOM from 'react-dom/client'; // ReactDOM lets React talk to the browser
import App from './App'; // Main App component (The whole app starts here)
import './index.css'; // Global styles for the app
import { AuthProvider } from './utils/AuthContext';
import { BrowserRouter } from 'react-router-dom'; // For routing between pages

/**
 * Create a "root" where React will put all the app content.
 * document.getElementById('root') finds the <div id="root"></div> in index.html.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));

/**
 * Render the App component inside the root.
 * React.StrictMode is a helper that checks for problems in the code
 * and warns you during development (it doesn’t affect production).
 */
root.render(
  <React.StrictMode>
    <BrowserRouter>
     <AuthProvider>
      <App /> {/* This is the whole app */}
     </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
