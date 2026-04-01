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
  const [showNewMenu, setShowNewMenu] = useState(false); // For the "+ New" dropdown in sidebar
  const [showSearchModal, setShowSearchModal] = useState(false); // For the search modal
  const [friendSearch, setFriendSearch] = useState(''); // For searching friends in the search modal
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, url, type }
  const [activeConversationTab, setActiveConversationTab] = useState('direct'); //'direct' or 'group', controls which tab is active in the sidebar chat list
  const [showAddFriendModal , setShowAddFriendModal] = useState(false); // For the "Add Friend" modal when clicking that option in settings
  const [addFriendSearch, setAddFriendSearch] = useState(''); // For searching friends in the "Add Friend" modal
  const [addFriendSelected, setAddFriendSelected] = useState(null); // For selecting a friend in the "Add Friend" modal

  const settingsMenuRef = useRef(null);
  const newMenuRef = useRef(null); // ref for the "+ New" dropdown menu to handle clicks outside of it
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null); // ref to auto growing textarea for message input


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
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) {
        setShowNewMenu(false);
      } // Add more dropdowns here if needed
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

  // Auto-grow message input box
  useEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;

    const maxHeight = 160; //  Max height for the input box
    input.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`; // Set height to scrollHeight but cap at maxHeight
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'; // Show scrollbar if content exceeds max height
  }, [newMessage]);

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
          members: [user.name, mockUser.name],
          messages: [
            { id: 1, content: `Hello ${user.name}`, type: 'received', time: '11:58 AM' },
            { id: 2, content: "This is a mock conversation for UI testing.", type: 'received', time: '11:59 AM' }
          ]
        }));

      setChats(mockChatList); // Save chats

      if (mockChatList.length > 0) {
        setActiveChat({ ...mockChatList[0], unreadCount: 0 }); // Open first chat by default and mark read
        setChats(prev => prev.map(c => c.id === mockChatList[0].id ? { ...c, unreadCount: 0 } : c));
      }
    };

    if (user) {
      loadChats();
    }
  }, [user]);

  // Auto-scroll when activeChat changes
  useEffect(() => {
    scrollToBottom();
    if (activeChat) {
      setChats(prev =>
        prev.map(c =>
          c.id === activeChat.id ? { ...c, unreadCount: 0 } : c
        )
      );
    }
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

    // Update chats list and move conversation to top
    setChats(prevChats => {
      const others = prevChats.filter(chat => chat.id !== activeChat.id);
      return [updatedChat, ...others];
    });

    setNewMessage(''); // Clear input box
    // Keep object URL alive so download works; reset picker state only.
    setAttachedFile(null); // Clear file tag
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message when pressing Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
    setShowNewMenu(false); // Close the "+ New" dropdown
    setFriendSearch(''); // reset search query
    setShowSearchModal(true); // Open the search modal to find friends and start a new chat
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
    setShowSettingsMenu(false); // Close settings dropdown
    setShowNewMenu(false); // Close the "+ New" dropdown if it's open
    setAddFriendSearch(''); // Reset search query
    setAddFriendSelected(null); // Clear any previous selection
    setShowAddFriendModal(true); // Open the "Add Friend" modal
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

  const handleSelectChat = (chatId) => {
    setChats(prev => {
      const updated = prev.map(c =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      );
      const selected = updated.find(c => c.id === chatId);
      setActiveChat(selected || null);
      return updated;
    });
    setSidebarOpen(false);
  };

  // When selecting a friend from the search modal, either open existing chat or create new one
  const handleSearchFriendSelect = (person) => {
    const existingChat = chats.find(chat =>
      (chat.members?.length || 0) <= 2 && chat.name === person.name
    );

    // If a direct chat with that person already exists, open it. Otherwise, create a new one.
    if (existingChat) {
      setActiveChat(existingChat);
    } else {
      const newChat = createChatShell(person.name, [user?.name || 'You', person.name]);
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
    }

    setShowSearchModal(false); // Close the search modal
    setShowNewMenu(false); // Close the "+ New" dropdown if it's still open
    setFriendSearch(''); // Reset search query for next time
    setSidebarOpen(false); // Close sidebar on mobile after selecting a chat
  };

  const directChats = chats.filter(c => (c.members?.length || 2) <= 2); // Direct messages are defined as chats with 2 or fewer members (including self)
  const groupChats = chats.filter(c => (c.members?.length || 1) > 2); // Group chats are defined as chats with more than 2 members
  const visibleChats = activeConversationTab === 'direct' ? directChats : groupChats; // Chats to show based on active tab
  // Text to show when there are no conversations in the active tab
  const emptyStateText = activeConversationTab === 'direct'
    ? 'No direct messages yet.'
    : 'No group conversations yet.';
  const filteredFriends = mockUsers.filter(person =>
    person.name.toLowerCase().includes(friendSearch.toLowerCase())
  ); // Friends filtered by search query in the search modal

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
              <div className="chat-action-menu" ref={newMenuRef}>
                <button
                  className="new-chat-btn"
                  aria-haspopup="true"
                  aria-expanded={showNewMenu}
                  onClick={() => setShowNewMenu(prev => !prev)}
                >
                  + New
                </button>
                {showNewMenu && (
                  <div className="chat-action-dropdown">
                    <button onClick={handleAddFriend}>Add Friend</button>
                    <button onClick={handleNewChat}>Search Friends</button>
                  </div>
                )}
              </div>
              <button className="group-chat-btn" onClick={() => { setShowGroupModal(true); setGroupSelection([]); }}>+ Group</button>
            </div>
          </div>

          {/*Tabs for Direct messages vs Group chats*/}
          <div className="conversation-tabs" role="tablist" aria-label="Conversation type">
            <button
              type="button"
              role="tab"
              aria-selected={activeConversationTab === 'direct'}
              className={`conversation-tab ${activeConversationTab === 'direct' ? 'active' : ''}`}
              onClick={() => setActiveConversationTab('direct')}
            >
              DMs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeConversationTab === 'groups'}
              className={`conversation-tab ${activeConversationTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveConversationTab('groups')}
            >
              Groups
            </button>
          </div>

          <div className="conversation-panel" role="tabpanel">
            {visibleChats.length > 0 ? (
              visibleChats.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
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
              ))
            ) : (
              <div className="conversation-empty-state">
                <p>{emptyStateText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact nav shown when the full sidebar is hidden on small screens */}
      {/*
      <div className={`mini-nav ${sidebarOpen ? 'hidden' : ''}`}>
        <button
          className="mini-nav-btn"
          aria-label="Open conversations list"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      </div>
      */}

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
                ☰
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
                <div
                  key={message.id}
                  className={`message ${message.type}`}
                >
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
              <div className="message-input-field">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                />
              </div>
              {attachedFile && (
                <span className="file-tag" title={attachedFile.name}>{attachedFile.name}</span>
              )}
              <div className="message-input-actions">
                {/* Emoji input */}
                <button className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
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
                <button className="send-btn" onClick={handleSendMessage}>
                  ➤
                </button>
              </div>
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

      {/* Search modal for finding friends to chat with */}
      {showSearchModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowSearchModal(false)} />
          <div className="search-modal" role="dialog" aria-modal="true">
            <div className="search-modal__header">
              <div>
                <h4>Search Friends</h4>
                <p>Find an existing contact and start a conversation.</p>
              </div>
              <button className="modal-close" onClick={() => setShowSearchModal(false)} aria-label="Close search modal">×</button>
            </div>

            <div className="search-modal__body">
              <input
                type="text"
                className="search-modal__input"
                placeholder="Search by name"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                autoFocus
              />

              <div className="search-results">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map(person => (
                    <button
                      key={person.id}
                      className="search-result"
                      onClick={() => handleSearchFriendSelect(person)}
                    >
                      <div className="search-result__avatar">{person.avatar || person.name[0]}</div>
                      <div className="search-result__info">
                        <div className="search-result__name">{person.name}</div>
                        <div className="search-result__meta">{person.status || 'offline'}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="search-results__empty">No friends match that search.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowAddFriendModal(false)} />
          <div className="addfriend-modal search-modal" role="dialog" aria-modal="true">
            <div className="addfriend-modal__header">
              <h4>Add Friend</h4>
              <button 
                className="modal-close" 
                onClick={() => setShowAddFriendModal(false)}
                >
                  
                </button>
            </div>

            <div className="search-modal__body">
              <p>Type the username of the friend you want to add and start a conversation.</p>
              <input
                type="text"
                className="search-modal__input"
                placeholder="Enter friend's name"
                value={addFriendSearch}
                onChange={(e) => {
                  setAddFriendSearch(e.target.value);
                  setAddFriendSelected(null); // Clear selection when search changes
                }}
                autoFocus
              />

              {/*Avatar preview*/}
              {addFriendSelected && (
                <div className="addfriend-preview">
                  <div className="addfriend-preview_avatar">
                    {addFriendSelected.avatar || addFriendSelected.name[0]}
                  </div>
                  <div className="addfriend-preview_info">
                    <div className="addfriend-name">{addFriendSelected.name}</div>
                    <div className="addfriend-status">{addFriendSelected.status || 'offline'}</div>
                  </div>
                </div>
              )}

              {/*Results */}
              <div className="search-results">
                {mockUsers
                  .filter(u => u.username !== user?.username) // exclude self if present
                  .filter(u => u.name.toLowerCase().includes(addFriendSearch.toLowerCase()))
                 .map((user) => (
                 <button
                    key={user.id}
                    className={`search-result ${
                      addFriendSelected?.id === user.id ? 'active' : ''
                    }`}
                    onClick={() => setAddFriendSelected(user)}
                  >
                    <div className="search-result__avatar">
                      {user.avatar || user.name[0]}
                    </div>
                    <div className="search-result__info">
                      <div className="search-result__name">{user.name}</div>
                      <div className="search-result__meta">{user.status || 'offline'}</div>
                    </div>
                  </button>
                ))}
            </div> 

            <div className="addfriend-modal__footer">
              <button
                className="addfriend-btn"
                disabled={!addFriendSelected}
                onClick={() => {
                  const person = addFriendSelected;
                  const newChat = createChatShell(person.name, [user?.name || 'You', person.name]);
                  setChats(prev => [newChat, ...prev]);
                  setActiveChat(newChat);
                  setShowAddFriendModal(false);
                  setAddFriendSearch('');
                  setAddFriendSelected(null);
                }}
              >
                Add Friend
              </button>
            </div>
            </div>
          </div>
        </>
      )}  
          
    </div>
  );
};

export default Dashboard;
