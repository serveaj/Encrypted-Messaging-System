/**
 * Dashboard Component
 * This is the main chat screen of the app.
 * It shows:
 *  - A sidebar with the logged-in user's info and list of conversations.
 *  - A main chat area where messages are displayed and sent.
 *
 * Features:
 *  - Loads mock chat data from users.json (fake users for testing).
 *  - Lets you pick a chat and send messages.
 *  - Auto-scrolls to the newest message.
 *  - Shows unread counts and last message previews.
 *
 * @returns JSX The full dashboard layout with sidebar and chat area.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './utils/AuthContext';
import './Dashboard.css';
import mockUsers from './data/users.json'; // Fake users for testing

const Dashboard = () => {
  const { user, logout } = useAuth(); // Current logged-in user + logout function

  // State variables for chat handling
  const [chats, setChats] = useState([]);          // List of all conversations
  const [activeChat, setActiveChat] = useState(null); // The chat currently open
  const [newMessage, setNewMessage] = useState('');   // Text typed in input box

  const messagesEndRef = useRef(null); // Reference for auto-scrolling

  // Scrolls the chat window to the bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  };

  // Load mock chats when user is available
  useEffect(() => {
    const loadChats = () => {
      if (!user) return; // Do nothing if no user yet

      console.log("[MOCK] Generating chats from mockUsers.json");

      // Create fake chat list from mock users
      const mockChatList = mockUsers
        .filter(mockUser => mockUser.username !== user.username) // Exclude self
        .map((mockUser, index) => ({
          id: mockUser.id,
          name: mockUser.name,
          avatar: mockUser.avatar.includes('ui-avatars') 
                  ? mockUser.name.split(' ').map(n => n[0]).join('') 
                  : mockUser.avatar, 
          status: 'Online',
          lastMessage: index === 0 
                  ? `Hi ${user.name}, ready to test the UI!` 
                  : `Last message from ${mockUser.name}.`,
          lastMessageTime: '12:00 PM',
          unreadCount: index === 0 ? 1 : 0, 
          messages: [ 
            { id: 1, content: `Hello ${user.name}`, type: 'received', time: '11:58 AM' },
            { id: 2, content: "This is a mock conversation for UI testing.", type: 'received', time: '11:59 AM' }
          ]
        }));

      setChats(mockChatList); // Save chats

      if (mockChatList.length > 0) {
        setActiveChat(mockChatList[0]); // Open first chat by default
      }
    };

    if (user) {
      loadChats();
    }
  }, [user]);

  // Auto-scroll when activeChat changes
  useEffect(() => {
    scrollToBottom();
  }, [activeChat]);

  // Send a new message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;

    const message = {
      id: Date.now(),
      content: newMessage,
      type: 'sent',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update active chat with new message
    const updatedChat = {
      ...activeChat,
      messages: [...activeChat.messages, message],
      lastMessage: newMessage,
      lastMessageTime: 'Just now'
    };

    setActiveChat(updatedChat);

    // Update chats list
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === activeChat.id ? updatedChat : chat
      )
    );

    setNewMessage(''); // Clear input box
  };

  // Send message when pressing Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar with user info and chat list */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            {/* User avatar with fallback if image fails */}
            <img 
              src={user?.avatar} 
              alt={user?.name} 
              className="user-avatar" 
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=4CAF50&color=fff` 
              }} 
            />
            <div className="user-details">
              <h3>{user?.name}</h3>
              <span className="user-status">Online</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

        {/* List of chats */}
        <div className="chats-list">
          <div className="chats-header">
            <h3>Conversations</h3>
            <button className="new-chat-btn">+ New Chat</button>
          </div>
          
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => setActiveChat(chat)}
            >
              <div className="chat-avatar">{chat.avatar}</div>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-preview">{chat.lastMessage}</div>
              </div>
              <div className="chat-meta">
                <div className="chat-time">{chat.lastMessageTime}</div>
                {chat.unreadCount > 0 && (
                  <div className="unread-count">{chat.unreadCount}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="main-content">
        {activeChat ? (
          <div className="chat-area">
            <div className="chat-header">
              <div className="chat-avatar">{activeChat.avatar}</div>
              <div className="chat-info">
                <div className="chat-name">{activeChat.name}</div>
                <div className="chat-status">{activeChat.status}</div>
              </div>
            </div>

            {/* Messages list */}
            <div className="messages-container" ref={messagesEndRef}> 
              {activeChat.messages.map(message => (
                <div key={message.id} className={`message ${message.type}`}>
                  {message.content}
                  <div className="message-time">{message.time}</div>
                </div>
              ))}
              <div style={{ height: '1px' }} /> 
            </div>

            {/* Input box for new messages */}
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
              />
              <button className="send-btn" onClick={handleSendMessage}>
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="no-chat-selected">
            <h3>Welcome to SecureComm</h3>
            <p>Select a conversation or start a new one to begin messaging.</p>
            <p>All messages are end-to-end encrypted 🔒</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
