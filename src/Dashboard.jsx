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

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './utils/AuthContext';
import { io } from 'socket.io-client';
import './Dashboard.css';
import emojis from './assets/Emojis/openmoji.json';

const API_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();

  const [chats, setChats] = useState([]);               // List of all conversations
  const [activeChat, setActiveChat] = useState(null);   // The chat currently open
  const [newMessage, setNewMessage] = useState('');     // Text typed in input box
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state

  const messagesEndRef = useRef(null);
  const nextIdRef = useRef(Date.now()); // simple id source for new chats

  // Users fetched from the backend
  const [users, setUsers] = useState([]);

  // Holds Socket.io connection
  const socketRef = useRef(null);

  // Tracks the currently active chat in a ref
  const activeChatRef = useRef(null);

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
  // Load dark mode preference from localStorage so it persists after refresh
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [attachedFile, setAttachedFile] = useState(null);
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
    .filter(e => e.group?.includes(activeCategory))
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

  // Emoji menu effets, close when clicked outside of emoji menu box
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

  // Keep activeChatRef in sync whenever activeChat state changes
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

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

  // Grow message input box
  useEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;

    const maxHeight = 160; //  Max height for the input box
    input.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`; // Set height to scrollHeight but cap at maxHeight
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'; // Show scrollbar if content exceeds max height
  }, [newMessage]);

  // Fetch users from the backend
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) return;

      try {
        const response = await fetch(`${API_URL}/api/auth/users`);
        const data = await response.json();

        if (data.success) {
          setUsers(data.users.filter(u => u.id !== user.id));

          const token = localStorage.getItem('token');

          const contactsRes = await fetch(`${API_URL}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const contactsData = await contactsRes.json();

          const chatList = contactsData.success
            ? contactsData.contacts.map(u => ({
                id:              u.id,
                name:            u.name,
                username:        u.username,
                avatar:          u.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2),
                status:          'offline',
                lastMessage:     'Click to start chatting',
                lastMessageTime: '',
                unreadCount:     0,
                messages:        [],
                members:         [user.name, u.name],
              }))
            : [];

          // Message preview for each chat
          const previewsRes = await fetch(`${API_URL}/api/messages/previews`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const previewsData = await previewsRes.json();

          const previewMap = {};
          if (previewsData.success) {
            for (const p of previewsData.previews) {
              previewMap[p.other_id] = {
                lastMessage:     p.content,
                lastMessageTime: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
            }
          }

          // Fetch who is currently online
          const onlineRes = await fetch(`${API_URL}/api/online`);
          const onlineData = await onlineRes.json();
          const onlineIds = new Set(onlineData.success ? onlineData.onlineUserIds : []);

          // Apply previews and online status to each chat
          const chatListWithPreviews = chatList.map(chat => ({
            ...chat,
            ...(previewMap[chat.id] || {}),
            status: onlineIds.has(chat.id) ? 'online' : 'offline',
          }));

          // Also load any groups this user belongs to
          const groupRes = await fetch(`${API_URL}/api/groups`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const groupData = await groupRes.json();

          let groupChats = [];
          if (groupData.success) {
            groupChats = groupData.groups.map(g => ({
              id:              `group_${g.id}`,
              groupId:         g.id,
              name:            g.name,
              isGroup:         true,
              avatar:          g.name[0]?.toUpperCase() || 'G',
              status:          `${g.member_ids.length} members`,
              lastMessage:     g.last_message
                                 ? `${g.last_message_sender}: ${g.last_message}`
                                 : 'Click to view messages',
              lastMessageTime: g.last_message_at
                                 ? new Date(g.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                 : '',
              unreadCount:     0,
              messages:        [],
              members:         g.member_ids,
            }));
          }

          setChats([...chatListWithPreviews, ...groupChats]);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load users:', err);
      }
    };

    if (user) loadUsers();
  }, [user]);

  // Connect to Socket.io
  useEffect(() => {
    if (!user) return;

    // Create the socket connection to our backend
    const socket = io(API_URL);
    socketRef.current = socket;

    // Tell the server the user is so it can route messages to them
    socket.emit('register', user.id);

    // Listen for incoming messages from other users
    socket.on('receive_message', (message) => {
      const senderId = Number(message.senderId);
      // Decryption should go here
      const contentToDisplay = message.content;

      const newMsg = {
        id:      message.id,
        content: contentToDisplay,
        type:    'received',
        time:    new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Update the chat list and move the DM to the top
      setChats(prev => {
        const chatIndex = prev.findIndex(chat => !chat.isGroup && chat.id === senderId);
        if (chatIndex === -1) return prev;

        const chat = prev[chatIndex];
        const isOpen = activeChatRef.current?.id === senderId;
        const updatedChat = {
          ...chat,
          messages:        [...chat.messages, newMsg],
          lastMessage:     contentToDisplay,
          lastMessageTime: 'Just now',
          unreadCount:     isOpen ? 0 : (chat.unreadCount || 0) + 1,
        };

        return [
          updatedChat,
          ...prev.slice(0, chatIndex),
          ...prev.slice(chatIndex + 1),
        ];
      });

      setActiveChat(prev => {
        if (!prev || prev.id !== senderId) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
    });

    // Listen for user online/offline changes
    socket.on('user_online', (userId) => {
      setChats(prev => prev.map(chat =>
        chat.id === userId ? { ...chat, status: 'online' } : chat
      ));
    });

    socket.on('user_offline', (userId) => {
      setChats(prev => prev.map(chat =>
        chat.id === userId ? { ...chat, status: 'offline' } : chat
      ));
    });

    // Listen for a new group being created
    socket.on('group_created', (group) => {
      const groupChatId = `group_${group.id}`;
      const newGroupChat = {
        id:              groupChatId,
        groupId:         group.id,       
        name:            group.name,
        isGroup:         true,
        avatar:          group.name[0]?.toUpperCase() || 'G',
        status:          `${group.memberIds.length} members`,
        lastMessage:     'Group created',
        lastMessageTime: 'Just now',
        unreadCount:     0,
        messages:        [],
        members:         group.memberIds,
      };

      // Add to chat list
      setChats(prev => {
        if (prev.find(c => c.id === groupChatId)) return prev;
        return [newGroupChat, ...prev];
      });
    });

    // Listen for incoming group messages from other users
    socket.on('receive_group_message', (message) => {
      const groupChatId = `group_${message.groupId}`;
      const newMsg = {
        id:         message.id,
        content:    message.content,
        senderName: message.senderName,
        type:       'received',
        time:       new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const isOpen = activeChatRef.current?.id === groupChatId;

      setChats(prev => prev.map(chat => {
        if (chat.id !== groupChatId) return chat;
        return {
          ...chat,
          messages:        [...chat.messages, newMsg],
          lastMessage:     `${message.senderName}: ${message.content}`,
          lastMessageTime: 'Just now',
          unreadCount:     isOpen ? 0 : (chat.unreadCount || 0) + 1,
        };
      }));

      setActiveChat(prev => {
        if (!prev || prev.id !== groupChatId) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
    });

    // Disconnect the socket when user logs out or disconnects
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Scroll when activeChat changes
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

  // Load message history from the database when opening a conversation
  const loadMessageHistory = async (otherUserId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/messages/${otherUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }, // send our login token
      });
      const data = await response.json();

      if (data.success) {
        const messages = data.messages.map(msg => ({
          id:      msg.id,
          // Decryption here
          content: msg.content,
          type:    msg.sender_id === user.id ? 'sent' : 'received',
          time:    new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        // Update both the active chat view and the chats list with the loaded history
        setActiveChat(prev => prev ? { ...prev, messages } : prev);
        setChats(prev => prev.map(c => c.id === otherUserId ? { ...c, messages } : c));
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load message history:', err);
    }
  };

  // Load message history for a group conversation
  const loadGroupMessageHistory = async (groupId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        const messages = data.messages.map(msg => ({
          id:         msg.id,
          content:    msg.content,
          senderName: msg.sender_name,
          type:       msg.sender_id === user.id ? 'sent' : 'received',
          time:       new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        const groupChatId = `group_${groupId}`;
        setActiveChat(prev => prev ? { ...prev, messages } : prev);
        setChats(prev => prev.map(c => c.id === groupChatId ? { ...c, messages } : c));
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load group message history:', err);
    }
  };

  // Send a new message
  const handleSendMessage = () => {
    if ((!newMessage.trim() && !attachedFile) || !activeChat) return;

    const content = newMessage.trim() || (attachedFile ? attachedFile.name : '');

    // Encryption here
    const contentToSend = content;

    if (socketRef.current) {
      if (activeChat.isGroup) {
        socketRef.current.emit('send_group_message', {
          senderId: user.id,
          groupId:  activeChat.groupId,
          content:  contentToSend,
        });
      } else {
        socketRef.current.emit('send_message', {
          senderId:    user.id,
          recipientId: activeChat.id,
          content:     contentToSend,
        });
      }
    }

    // Add the message to the UI immediately so it feels instant
    // The server will confirm with the real saved ID via 'message_sent' event
    const message = {
      id:       Date.now(), // temporary ID, replaced when server confirms
      content:  content,    // show the original (unencrypted) content to the sender
      fileName: attachedFile?.name || null,
      fileUrl:  attachedFile?.url  || null,
      fileType: attachedFile?.type || null,
      type:     'sent',
      time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedChat = {
      ...activeChat,
      messages:        [...activeChat.messages, message],
      lastMessage:     content,
      lastMessageTime: 'Just now',
    };

    setActiveChat(updatedChat);
    setChats(prevChats => {
      const others = prevChats.filter(chat => chat.id !== activeChat.id);
      return [updatedChat, ...others];
    });

    setNewMessage('');
    setAttachedFile(null);
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
    setFriendSearch('');
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
    setAddFriendSearch('');
    setAddFriendSelected(null);
    setShowAddFriendModal(true); // Open the "Add Friend" modal
  };

  const handleCreateGroupFromSelection = () => {
    if (groupSelection.length < 2) return;

    const name = groupName.trim() || `Group (${groupSelection.length})`;

    if (socketRef.current) {
      socketRef.current.emit('create_group', {
        creatorId: user.id,
        name,
        memberIds: groupSelection,
      });
    }

    setShowGroupModal(false);
    setGroupSelection([]);
    setGroupName('');
  };

  const toggleGroupMember = (id) => {
    setGroupSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Save new display name
  const handleSaveName = async () => {
    if (!displayName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: displayName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        updateUser(data.user);      
        setShowSettingsModal(false);
      } else {
        alert(data.message || 'Failed to save name.');
      }
    } catch (err) {
      console.error('[Settings] Save name error:', err);
      alert('Could not connect to the server.');
    }
  };

  const handleSelectChat = (chatId) => {
    // Clear unread count and set this chat as active
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    const selected = chats.find(c => c.id === chatId);
    if (selected) {
      setActiveChat({ ...selected, unreadCount: 0 });
      // Load the history depending on whether this is a group or direct chat
      if (selected.isGroup) {
        loadGroupMessageHistory(selected.groupId);
      } else {
        loadMessageHistory(selected.id);
      }
    }
    setSidebarOpen(false);
  };

  // When selecting a friend from the search modal, open existing chat or create new one
  const handleSearchFriendSelect = (person) => {
    // Match by real user ID
    const existingChat = chats.find(c => !c.isGroup && c.id === person.id);

    if (existingChat) {
      setActiveChat(existingChat);
    } else {
      const newChat = {
        id:              person.id,
        name:            person.name,
        avatar:          person.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2),
        status:          'online',
        lastMessage:     'Click to start chatting',
        lastMessageTime: '',
        unreadCount:     0,
        messages:        [],
        members:         [user?.name || 'You', person.name],
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
    }

    setShowSearchModal(false);
    setShowNewMenu(false);
    setFriendSearch('');
    setSidebarOpen(false);
  };

  const directChats = chats.filter(c => (c.members?.length || 2) <= 2); // Direct messages are defined as chats with 2 or less members
  const groupChats = chats.filter(c => (c.members?.length || 1) > 2); // Group chats are defined as chats with more than 2 members
  const visibleChats = activeConversationTab === 'direct' ? directChats : groupChats; // Chats to show based on active tab
  // When there are no conversations in the active tab
  const emptyStateText = activeConversationTab === 'direct'
    ? 'No direct messages yet.'
    : 'No group conversations yet.';
  const filteredFriends = users.filter(person =>
    person.name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar with user info and chat list */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="user-info">
            {/* User avatar with fallback if image fails */}
            <div className="user-avatar">
              {user?.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2)}
            </div>
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
                  {/* Show sender name above received messages in group chats */}
                  {activeChat.isGroup && message.type === 'received' && message.senderName && (
                    <div className="message-sender-name">{message.senderName}</div>
                  )}
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
                  onChange={(e) => {
                    setIsDarkMode(e.target.checked);
                    localStorage.setItem('darkMode', e.target.checked);
                  }}
                />
                <span>Dark mode</span>
              </label>
            </div>

            <div className="settings-modal__footer">
              <button className="ghost-btn" onClick={() => setShowSettingsModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSaveName}>Save</button>
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
              {users.map(u => (   // users from API already excludes the logged-in user
                  <label key={u.id} className="group-row">
                    <input
                      type="checkbox"
                      checked={groupSelection.includes(u.id)}
                      onChange={() => toggleGroupMember(u.id)}
                    />
                    <div className="group-row__avatar">{u.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2)}</div>
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
                      <div className="search-result__avatar">{person.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2)}</div>
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
                    {addFriendSelected.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2)}
                  </div>
                  <div className="addfriend-preview_info">
                    <div className="addfriend-name">{addFriendSelected.name}</div>
                    <div className="addfriend-status">{addFriendSelected.status || 'offline'}</div>
                  </div>
                </div>
              )}

              {/*Results */}
              <div className="search-results">
                {users
                  .filter(u => u.name.toLowerCase().includes(addFriendSearch.toLowerCase()))
                  .map((u) => ( // renamed to 'u' to avoid shadowing the logged-in 'user'
                  <button
                    key={u.id}
                    className={`search-result ${addFriendSelected?.id === u.id ? 'active' : ''}`}
                    onClick={() => setAddFriendSelected(u)}
                  >
                    <div className="search-result__avatar">
                      {u.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2)}
                    </div>
                    <div className="search-result__info">
                      <div className="search-result__name">{u.name}</div>
                      <div className="search-result__meta">{u.status || 'offline'}</div>
                    </div>
                  </button>
                ))}
            </div> 

            <div className="addfriend-modal__footer">
              <button
                className="addfriend-btn"
                disabled={!addFriendSelected}
                onClick={async () => {
                  const person = addFriendSelected;
                  const token = localStorage.getItem('token');

                  // Save the contact to the database so it persists after refresh
                  await fetch(`${API_URL}/api/contacts`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ contactId: person.id }),
                  });

                  // Add to the sidebar if not already there
                  const existingChat = chats.find(c => !c.isGroup && c.id === person.id);
                  if (!existingChat) {
                    const newChat = {
                      id:              person.id,
                      name:            person.name,
                      avatar:          person.name.split(' ').map(n => n[0]?.toUpperCase()).join('').slice(0, 2),
                      status:          'online',
                      lastMessage:     'Click to start chatting',
                      lastMessageTime: '',
                      unreadCount:     0,
                      messages:        [],
                      members:         [user?.name || 'You', person.name],
                    };
                    setChats(prev => [newChat, ...prev]);
                    setActiveChat(newChat);
                  } else {
                    setActiveChat(existingChat);
                  }

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
