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
import emojis from './assets/Emojis/openmoji.json'; // For emojis

const Dashboard = () => {
  const { user, logout } = useAuth(); // Current logged-in user + logout function

  // State variables for chat handling
  const [chats, setChats] = useState([]);               // List of all conversations
  const [activeChat, setActiveChat] = useState(null);   // The chat currently open
  const [newMessage, setNewMessage] = useState('');     // Text typed in input box
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state

  const messagesEndRef = useRef(null); // Reference for auto-scrolling
  const nextIdRef = useRef(Date.now()); // simple id source for new chats

  // Handels emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Emoji set
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys-emotion');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSelection, setGroupSelection] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, url, type }

  const settingsMenuRef = useRef(null);
  const fileInputRef = useRef(null);


  // for emojis
  const filteredEmojis = emojis
    .filter(e => e.group?.includes(activeCategory)) // match category
    .filter(e => e.annotation?.toLowerCase().includes(emojiSearch.toLowerCase()) 
            || e.tags?.toLowerCase().includes(emojiSearch.toLowerCase()));

  // emojis categories
  const emojiCategories = [
    { icon: "😆", group: "smileys-emotion" },
    { icon: "🐶", group: "animals-nature" },
    { icon: "⚽️", group: "activities" },
    { icon: "🌍️", group: "travel-places" },
    { icon: "👓️", group: "objects" },
    { icon: "🚻", group: "symbols" },
    { icon: "🏴‍☠️", group: "flags" }
  ];

  // Emoji menu effets. close when clicked outside of emoji menu box
  useEffect(() => {
    const handleClickOutside = (event) => {
      const picker = document.querySelector('.emoji-picker');
      const emojiBtn = document.querySelector('.emoji-btn');
      if (picker && !picker.contains(event.target) && !emojiBtn.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
  }, []);

  // Sync display name when user changes
  useEffect(() => {
    setDisplayName(user?.name || '');
  }, [user]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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
    if ((!newMessage.trim() && !attachedFile) || !activeChat) return;

    const message = {
      id: Date.now(),
      content: newMessage || (attachedFile ? attachedFile.name : ''),
      fileName: attachedFile?.name || null,
      fileUrl: attachedFile?.url || null,
      fileType: attachedFile?.type || null,
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
    // Keep object URL alive so download works; reset picker state only.
    setAttachedFile(null); // Clear file tag
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message when pressing Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const createChatShell = (name, members) => {
    nextIdRef.current += 1;
    return {
      id: nextIdRef.current,
      name,
      avatar: name
        .split(' ')
        .map(word => word[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 3),
      status: `${members.length} member${members.length === 1 ? '' : 's'}`,
      lastMessage: 'New conversation started',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      messages: [
        { id: `${nextIdRef.current}-seed`, content: 'Say hello to everyone!', type: 'received', time: 'Now' }
      ],
      members
    };
  };

  const handleNewChat = () => {
    const name = prompt('Who do you want to chat with?');
    if (!name || !name.trim()) return;
    const newChat = createChatShell(name.trim(), [user?.name || 'You', name.trim()]);
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    setSidebarOpen(false);
  };

  const handleFileButton = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAttachedFile(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setAttachedFile({ name: file.name, url, type: file.type });
  };

  const handleAddFriend = () => {
    const name = prompt('Enter the friend name to add:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const newChat = createChatShell(trimmed, [user?.name || 'You', trimmed]);
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    setSidebarOpen(false);
  };

  const handleCreateGroupFromSelection = () => {
    const selectedUsers = mockUsers.filter(u => groupSelection.includes(u.id));
    const uniqueMembers = Array.from(new Set([user?.name || 'You', ...selectedUsers.map(u => u.name)]));
    if (uniqueMembers.length < 3) return;
    const name = groupName.trim() || `Group (${uniqueMembers.length - 1})`;
    const newChat = createChatShell(name, uniqueMembers);
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    setSidebarOpen(false);
    setShowGroupModal(false);
    setGroupSelection([]);
    setGroupName('');
  };

  const toggleGroupMember = (id) => {
    setGroupSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar with user info and chat list */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
              <h3>{displayName || user?.name}</h3>
              <span className="user-status">Online</span>
            </div>
          </div>
          <div className="settings-wrap" ref={settingsMenuRef}>
            <button
              className="settings-btn"
              aria-haspopup="true"
              aria-expanded={showSettingsMenu}
              onClick={() => setShowSettingsMenu(prev => !prev)}
            >
              ⋮
            </button>
            {showSettingsMenu && (
              <div className="settings-dropdown">
                <button onClick={() => { setShowSettingsMenu(false); setShowSettingsModal(true); }}>Settings</button>
                <button onClick={() => { setShowSettingsMenu(false); handleAddFriend(); }}>Add Friend</button>
                <button className="dropdown-logout" onClick={() => { setShowSettingsMenu(false); logout(); }}>Logout</button>
              </div>
            )}
          </div>
        </div>

        {/* List of chats */}
        <div className="chats-list">
          <div className="chats-header">
            <h3>Conversations</h3>
            <div className="chat-actions-compact">
              <button className="new-chat-btn" onClick={handleNewChat}>+ New</button>
              <button className="group-chat-btn" onClick={() => { setShowGroupModal(true); setGroupSelection([]); }}>+ Group</button>
            </div>
          </div>
          
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => { setActiveChat(chat); setSidebarOpen(false); }}
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

      {/* Compact nav shown when the full sidebar is hidden on small screens */}
      <div className={`mini-nav ${sidebarOpen ? 'hidden' : ''}`}>
        <button
          className="mini-nav-btn"
          aria-label="Open conversations list"
          onClick={() => setSidebarOpen(true)}
        >
          💬
        </button>
        <button
          className="mini-nav-btn"
          aria-label="Start new chat"
          onClick={() => setSidebarOpen(true)}
        >
          ＋
        </button>
      </div>

      {/* Main chat area */}
      <div className="main-content">
        {activeChat ? (
          <div className="chat-area">
            <div className="chat-header">
              <button
                className="sidebar-toggle"
                aria-label="Toggle chat list"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                Chats
              </button>
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
              {message.fileName && (
                <div className="message-file">
                  📎
                  {message.fileUrl ? (
                    message.fileType && message.fileType.startsWith('image') ? (
                      <a href={message.fileUrl} target="_blank" rel="noreferrer">
                        <img src={message.fileUrl} alt={message.fileName} className="message-image" />
                      </a>
                    ) : (
                      <a href={message.fileUrl} download={message.fileName} target="_blank" rel="noreferrer">
                        {message.fileName}
                      </a>
                    )
                  ) : (
                    <span>{message.fileName}</span>
                  )}
                </div>
              )}
                  <div className="message-time">{message.time}</div>
                </div>
              ))}
              <div style={{ height: '1px' }} /> 
            </div>

            {/* Emoji picker*/}
            {showEmojiPicker && (
              <div className="emoji-picker">
                {/* Search bar */}
                <input
                  type="text"
                  className="emoji-search"
                  placeholder="Search emojis..."
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                />

                {/* Category tabs */}
                <div className="emoji-categories">
                  {emojiCategories.map(cat => (
                    <button
                      key={cat.group}
                      className={`emoji-category ${activeCategory === cat.group ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat.group)} > {cat.icon}
                    </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="emoji-grid">
                {filteredEmojis.map((emoji, index) => (
                  <span key={index} onClick={() => {
                    setNewMessage(newMessage + emoji.emoji);
                  }}> 
                    {emoji.emoji}
                  </span>
                ))}
              </div>
            </div>
            )}

            {/* Input box for new messages */}
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
              />
              {/* Emoji input */}
              <button className="emoji-btn" onClick={()=> setShowEmojiPicker(!showEmojiPicker)}>
              😊
              </button>
              <button className="file-btn" onClick={handleFileButton} aria-label="Add file">
                📎
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {attachedFile && (
                <span className="file-tag" title={attachedFile.name}>{attachedFile.name}</span>
              )}
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

      {/* Mobile overlay for sidebar drawer */}
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Settings modal */}
      {showSettingsModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)} />
          <div className="settings-modal" role="dialog" aria-modal="true">
            <div className="settings-modal__header">
              <h4>Settings</h4>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)} aria-label="Close settings modal">×</button>
            </div>

            <div className="settings-modal__body">
              <label className="settings-field">
                <span>Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={(e) => setIsDarkMode(e.target.checked)}
                />
                <span>Dark mode</span>
              </label>
            </div>

            <div className="settings-modal__footer">
              <button className="ghost-btn" onClick={() => setShowSettingsModal(false)}>Close</button>
            </div>
          </div>
        </>
      )}

      {/* Group creation modal */}
      {showGroupModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowGroupModal(false)} />
          <div className="group-modal" role="dialog" aria-modal="true">
            <div className="group-modal__header">
              <h4>Create Group</h4>
              <button className="modal-close" onClick={() => setShowGroupModal(false)} aria-label="Close group modal">×</button>
            </div>

            <label className="group-modal__field">
              <span>Group name (optional)</span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Project Alpha"
              />
            </label>

            <div className="group-modal__list">
              {mockUsers
                .filter(u => u.username !== user?.username) // exclude self if present
                .map(u => (
                  <label key={u.id} className="group-row">
                    <input
                      type="checkbox"
                      checked={groupSelection.includes(u.id)}
                      onChange={() => toggleGroupMember(u.id)}
                    />
                    <div className="group-row__avatar">{u.avatar || u.name[0]}</div>
                    <div className="group-row__info">
                      <div className="group-row__name">{u.name}</div>
                      <div className="group-row__status">{u.status || 'offline'}</div>
                    </div>
                  </label>
                ))}
            </div>

            <div className="group-modal__footer">
              <span>{groupSelection.length} selected</span>
              <button
                className="group-create-btn"
                disabled={groupSelection.length < 2}
                onClick={handleCreateGroupFromSelection}
              >
                Create group
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
