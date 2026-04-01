# Description

SecureComm is a encrypted messaging web application built with **React**.
It demonstrates authentication, protected routes, chat UI functionality, 
and a full Dockerized development/production workflow.

---

## Project Setup

### **1. Clone the repository**
```bash
git clone https://github.com/serveaj/Encrypted-Messaging-System.git
cd Encrypted-Messaging-System
```
### **2. Try building the project**
```bash
Ctrl+Shift+B
```

### **3. Install dependencies**
```bash
npm install
```

### **4. Run locally**
```bash
npm start
```
App will be available at: **http://localhost:3000**

---

## Docker Usage

```bash
docker build --target dev -t encrypted-app-dev .
```

### **Run Dev Container**
```bash
docker run -p 3000:3000 --name encrypted-dev-container -d encrypted-app-dev
```

### **Build Production Image**
```bash
docker build --no-cache -t encrypted-app-prod .
```

### **Run Production Container**
```bash
docker run -p 8080:80 --name encrypted-prod-test -d encrypted-app-prod
```

---

## VS Code Tasks
This project includes `.vscode/tasks.json` for simplified Docker workflows:

- **Build Dev Image**
- **Docker Build & Test Prod**
- **Docker Start Dev & View** (Default – `Ctrl+Shift+B`)
- **Docker Start Prod Server**
- **Docker Start Dev (Live Reload)**

Run tasks via: **Terminal → Run Task** in VS Code.

---

## Project Structure
```
.
├── .dockerignore                 # Specifies files to ignore in Docker builds
├── .env                          # Environment variables
├── .gitignore                    # Files to ignore in Git version control
├── Dockerfile                    # Multi-stage Docker build configuration
├── index.html                    # Root HTML file
├── index.css                     # Global styling and reset
├── package.json
├── package-lock.json
├── README.md
├── src/
│    ├── assets/
│    │    ├── Emojis/
│    │    │    ├── emojiData.js       # Processed emoji data for use in app
│    │    │    └── openmoji.json      # Raw source file for OpenMoji data
│    │    └── Logos/
│    │         ├── hide.png             # Password visibility toggle icon
│    │         ├── login.gif            # Login screen graphic/animation
│    │         ├── unhide.png           # Password visibility toggle icon
│    │         └── webLogo.jpg          # Application logo
│    ├── data/
│    │    ├── chats.json              # Mock conversation history
│    │    └── users.json              # Mock user data for authentication
│    ├── styles/
│    │    ├── Dashboard.css           # Styling for the chat interface
│    │    └── Login.css               # Shared styles for login/register pages
│    ├── utils/
│    │    ├── AuthContext.jsx         # React Context for mock authentication logic
│    │    └── emojiProcessor.js       # Utility function for handling emoji rendering
│    ├── App.jsx                       # Main app component with routing
│    ├── Dashboard.jsx                 # Primary chat dashboard component
│    ├── index.jsx                     # React application entry point
│    ├── Login.jsx                     # Login form component
│    └── Register.jsx                  # Registration form component
└── .vscode/tasks.json            # VS Code tasks for Docker workflows
```

---

## Features

### **Authentication**
- Mock login & registration via `AuthContext`
- Session stored in **localStorage**
- **Protected routes** (Dashboard only accessible when logged in)

### **Chat Dashboard**
- Sidebar with user profile and conversation list
- Main chat area with messages
- **Auto-scroll to latest message**
- Mock conversations from `users.json`

### **Forms**
- Login validation
- Registration with confirm password & visibility toggle
- Error handling + loading states

### **Styling**
- Clean, responsive UI
- Animated borders and glow effects
- Custom styles: `Login.css` & `Dashboard.css`

### **Dockerized Environment**
- Multi-stage Dockerfile: **dev**, **build**, **prod**
- VS Code tasks for automated workflows
- Dev server → `http://localhost:3000`
- Prod server → `http://localhost:8080`

---

## Authentication Notes
- Login always succeeds in mock mode.
- If username not found in `users.json`, a temporary in-memory user is created.
- Session stored in `localStorage` (`token`, `user`).
- Logout clears session.

## New Updae
- Add Landing page / Home Page
- Auto-Expanding Chat Input
- Separate Navigation for DMs and Groups
- Fix Responsive Layout Issues
- Define “+ New” Button Functionality

## Future Improvements
- Real API for authentication
- JWT token support
- Backend chat via WebSocket or REST
- Stronger form validation & UI improvements
- Unit + integration tests