"use client";

import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent, getAllContent } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

// --- Types ---
type Activity = {
  activity_id: string;
  author_id: string;
  activity_type: string;
  parent_id: string | null;
  root_id: string | null;
  content_hash: string;
  created_at: string;
};

type Profile = { name: string; bio: string; avatarHash?: string };
type DM = { text: string; sender: string; receiver: string; timestamp: number };

export default function Home() {
  // ---- State ----
  const [userId, setUserId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [following, setFollowing] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');
  const [connected, setConnected] = useState(false);
  const [sendP2P, setSendP2P] = useState<((msg: string) => void) | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages'>('feed');
  const [feed, setFeed] = useState<Activity[]>([]);
  const [postText, setPostText] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [dmContacts, setDmContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ [contact: string]: DM[] }>({});
  const [dmInput, setDmInput] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ---- Core Functions ----

  // Register identity
  const registerIdentity = async () => {
    try {
      const identity = await generateIdentity();
      setPublicKey(identity.publicKey);
      setPrivateKey(identity.privateKey);

      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: identity.publicKey,
          handle: `user-${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.userId) {
        throw new Error(data.error || 'Registration failed');
      }

      setUserId(data.userId);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('publicKey', identity.publicKey);
      localStorage.setItem('privateKey', identity.privateKey);
      loadFollowing();
      loadFeed();
      loadMyProfile();
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Check console.');
    }
  };

  const resetIdentity = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('following');
    setUserId(null);
    setFollowing([]);
    setFeed([]);
    setConnected(false);
    setSendP2P(null);
    window.location.reload();
  };

  // ---- Profile ----

  const loadMyProfile = async () => {
    if (!userId) return;
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const profileActivity = data.activities?.find((a: any) => a.activity_type === 'PROFILE' && a.author_id === userId);
    if (profileActivity) {
      const content = getContent(profileActivity.activity_id);
      if (content) {
        setMyProfile(content);
        setProfileName(content.name || '');
        setProfileBio(content.bio || '');
      }
    }
  };

  const saveProfile = async () => {
    if (!userId || !privateKey) return alert('Register first');
    const content: Profile = { name: profileName, bio: profileBio };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);

    saveContent(activityId, content);

    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'PROFILE',
        parentId: null,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });

    setMyProfile(content);
    alert('Profile saved!');
  };

  const fetchProfile = async (targetUserId: string): Promise<Profile | null> => {
    const allContent = getAllContent();
    const profileId = Object.keys(allContent).find(id => 
      allContent[id].author === targetUserId && allContent[id].name !== undefined
    );
    if (profileId) return allContent[profileId];

    if (sendP2P) {
      return new Promise((resolve) => {
        const handler = (data: string) => {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'profile_response') {
              resolve(msg.profile);
            }
          } catch {}
        };
        sendP2P(JSON.stringify({ type: 'request_profile', userId: targetUserId }));
        setTimeout(() => resolve(null), 3000);
      });
    }
    return null;
  };

  // ---- Feed & Posts ----

  const loadFeed = async () => {
    try {
      const res = await fetch(`/api/feed`);
      const data = await res.json();
      let activities = data.activities || [];
      activities = activities.filter((a: any) => a.activity_type === 'POST');
      if (following.length > 0) {
        activities = activities.filter((a: any) => following.includes(a.author_id));
      }
      setFeed(activities);
    } catch (e) {
      console.error('Failed to load feed:', e);
    }
  };

  const createPost = async () => {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (!storedUserId || !storedPrivateKey) return alert('Register first');
    if (!postText.trim()) return;

    const content = { text: postText, timestamp: Date.now(), author: storedUserId };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: storedUserId, contentHash, nonce: Math.random() });
    const signature = await signActivity(storedPrivateKey, activityId, contentHash);

    saveContent(activityId, content);

    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'POST',
        parentId: null,
        rootId: null,
        contentHash,
        signature,
        userId: storedUserId
      })
    });

    setPostText('');
    loadFeed();
  };

  // ---- Following ----

  const loadFollowing = () => {
    const saved = localStorage.getItem('following');
    if (saved) setFollowing(JSON.parse(saved));
  };

  const saveFollowing = (list: string[]) => {
    setFollowing(list);
    localStorage.setItem('following', JSON.stringify(list));
  };

  const followUser = async (targetUserId: string) => {
    if (!userId || !privateKey) return alert('Register first');
    if (following.includes(targetUserId)) {
      saveFollowing(following.filter(id => id !== targetUserId));
      loadFeed();
      return;
    }

    const content = { action: 'follow', target: targetUserId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);

    saveContent(activityId, content);

    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'FOLLOW',
        parentId: targetUserId,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });

    saveFollowing([...following, targetUserId]);
    loadFeed();
  };

  // ---- Direct Messaging ----

  const sendDM = async (receiver: string, text: string) => {
    if (!userId || !privateKey) return alert('Register first');
    if (!text.trim()) return;
    if (!sendP2P) return alert('P2P not connected');

    const content: DM = { text, sender: userId, receiver, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);

    saveContent(activityId, content);
    sendP2P(JSON.stringify({ type: 'dm_message', activityId, content, signature }));

    setDmMessages(prev => ({
      ...prev,
      [receiver]: [...(prev[receiver] || []), content]
    }));
    setDmInput('');
  };

  const requestDMHistory = async (contact: string) => {
    if (!sendP2P) return;
    sendP2P(JSON.stringify({ type: 'request_dm_history', contactId: contact }));
  };

  // ---- P2P Message Handler ----

  const handleP2PMessage = (data: string, sendFn: (msg: string) => void) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'request_content': {
          const content = getContent(msg.activityId);
          if (content) {
            sendFn(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content }));
          }
          break;
        }

        case 'content_response': {
          saveContent(msg.activityId, msg.content);
          loadFeed();
          break;
        }

        case 'request_profile': {
          const profile = getMyProfile();
          if (profile) {
            sendFn(JSON.stringify({ type: 'profile_response', profile }));
          }
          break;
        }

        case 'profile_response': {
          const profileId = `profile_${Date.now()}`;
          saveContent(profileId, { ...msg.profile, author: targetId });
          alert('Profile received!');
          break;
        }

        case 'dm_message': {
          saveContent(msg.activityId, msg.content);
          const contact = msg.content.sender;
          setDmMessages(prev => ({
            ...prev,
            [contact]: [...(prev[contact] || []), msg.content]
          }));
          if (!dmContacts.includes(contact)) {
            setDmContacts(prev => [...prev, contact]);
          }
          break;
        }

        case 'request_dm_history': {
          const allContent = getAllContent();
          const dms = Object.keys(allContent)
            .filter(id => {
              const c = allContent[id];
              return c.sender && c.receiver && 
                     (c.sender === msg.contactId || c.receiver === msg.contactId);
            })
            .map(id => allContent[id]);
          sendFn(JSON.stringify({ type: 'dm_history_response', messages: dms }));
          break;
        }

        case 'dm_history_response': {
          msg.messages.forEach((dm: DM) => {
            const id = `dm_${dm.sender}_${dm.receiver}_${dm.timestamp}`;
            saveContent(id, dm);
            const contact = dm.sender === userId ? dm.receiver : dm.sender;
            setDmMessages(prev => ({
              ...prev,
              [contact]: [...(prev[contact] || []), dm]
            }));
            if (!dmContacts.includes(contact)) {
              setDmContacts(prev => [...prev, contact]);
            }
          });
          break;
        }

        default:
          console.log('Unknown P2P message type:', msg.type);
      }
    } catch (e) {
      console.error('P2P message error:', e);
    }
  };

  const getMyProfile = (): Profile | null => {
    if (!myProfile) return null;
    return myProfile;
  };

  // ---- P2P Connection ----

  const startAsInitiator = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await initiateConnection(userId, targetId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
    setTimeout(() => requestDMHistory(targetId), 1000);
  };

  const startAsListener = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await waitForConnection(userId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
  };

  // ---- Initialisation ----

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedPubKey = localStorage.getItem('publicKey');
    const savedPrivKey = localStorage.getItem('privateKey');

    if (savedUserId && savedPubKey && savedPrivKey) {
      setUserId(savedUserId);
      setPublicKey(savedPubKey);
      setPrivateKey(savedPrivKey);
      loadFollowing();
      loadFeed();
      loadMyProfile();
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      setUserId(null);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('activities-channel')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        () => {
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---- Render Functions ----

  function renderFeed() {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {userId?.slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                className="w-full border-0 focus:ring-0 resize-none text-gray-700 placeholder-gray-400"
                rows={2}
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  onClick={createPost}
                  className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>

        {feed.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No posts yet. Follow someone or create one!
          </div>
        ) : (
          feed.map((activity) => {
            const content = getContent(activity.activity_id);
            const isFollowing = following.includes(activity.author_id);
            return (
              <div key={activity.activity_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {activity.author_id.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{activity.author_id.slice(0,8)}</p>
                      <p className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => followUser(activity.author_id)}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>

                <div className="mt-3 text-gray-800 whitespace-pre-wrap">
                  {content ? content.text : 'Loading content...'}
                  {!content && sendP2P && (
                    <button
                      className="ml-2 text-blue-500 text-sm hover:underline"
                      onClick={() => {
                        sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
                      }}
                    >
                      Fetch P2P
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
                  <span>❤️ 0</span>
                  <span>💬 0</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
            <input
              className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              rows={4}
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              placeholder="Tell us about yourself"
            />
          </div>
          <button
            onClick={saveProfile}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Save Profile
          </button>
        </div>
        {myProfile && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700">Current Profile</h3>
            <p className="mt-1"><strong>Name:</strong> {myProfile.name}</p>
            <p><strong>Bio:</strong> {myProfile.bio}</p>
          </div>
        )}
      </div>
    );
  }

  function renderMessages() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          <div className="flex gap-2 mt-2">
            <input
              placeholder="Paste contact User ID"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
            <button
              onClick={startAsInitiator}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition text-sm"
            >
              Connect
            </button>
            <button
              onClick={startAsListener}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm"
            >
              Listen
            </button>
          </div>
          {connected && <p className="text-green-600 text-sm mt-2">✅ P2P Connected</p>}
        </div>

        <div className="flex flex-col md:flex-row h-96">
          <div className="md:w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-3 font-semibold text-gray-600 border-b border-gray-100">Contacts</div>
            {dmContacts.length === 0 ? (
              <div className="p-4 text-gray-400 text-sm">No contacts yet</div>
            ) : (
              dmContacts.map((contact) => (
                <div
                  key={contact}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition ${
                    selectedContact === contact ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedContact(contact);
                    requestDMHistory(contact);
                  }}
                >
                  <div className="font-medium text-gray-800">{contact.slice(0,8)}...</div>
                </div>
              ))
            )}
          </div>

          <div className="flex-1 flex flex-col">
            {selectedContact ? (
              <>
                <div className="p-3 border-b border-gray-200 font-semibold text-gray-700">
                  Chat with {selectedContact.slice(0,8)}...
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {(dmMessages[selectedContact] || []).map((dm, idx) => (
                    <div
                      key={idx}
                      className={`flex ${dm.sender === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          dm.sender === userId
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                      >
                        {dm.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200 flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Type a message..."
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendDM(selectedContact, dmInput)}
                  />
                  <button
                    onClick={() => sendDM(selectedContact, dmInput)}
                    className="bg-blue-500 text-white px-5 py-2 rounded-full hover:bg-blue-600 transition"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a contact to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Main UI ----

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">SocialMesh</h1>
          <p className="text-gray-500 mb-6">Decentralized social network</p>
          <button
            onClick={registerIdentity}
            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition"
          >
            Get Started – Register Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌐</span>
            <h1 className="text-xl font-bold text-blue-600">SocialMesh</h1>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-4">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">
              👤 {userId.slice(0,6)}...
            </span>
            <button
              onClick={resetIdentity}
              className="text-sm text-red-500 hover:text-red-700"
              title="Reset identity"
            >
              🔄
            </button>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Sidebar (desktop) */}
        <aside className="hidden md:block w-52 flex-shrink-0">
          <nav className="sticky top-20 space-y-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                activeTab === 'feed' ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-gray-100'
              }`}
            >
              <span>🏠</span> Feed
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-gray-100'
              }`}
            >
              <span>👤</span> Profile
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                activeTab === 'messages' ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-gray-100'
              }`}
            >
              <span>💬</span> Messages
            </button>
            <div className="border-t border-gray-200 my-2 pt-2 text-xs text-gray-400">
              <div className="px-4 py-1">P2P: {connected ? '✅' : '❌'}</div>
              {connected && <div className="px-4 py-1 text-xs text-green-600">Connected to {targetId.slice(0,6)}</div>}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {activeTab === 'feed' && renderFeed()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'messages' && renderMessages()}
        </main>

        {/* Right Sidebar (desktop) */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-20 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Who to follow</h3>
            <p className="text-sm text-gray-500">Connect with peers you discover</p>
            {feed.slice(0, 3).map((activity) => (
              <div key={activity.author_id} className="flex items-center justify-between py-2">
                <span className="text-sm">👤 {activity.author_id.slice(0,6)}</span>
                <button
                  onClick={() => followUser(activity.author_id)}
                  className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600"
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2">
        <button onClick={() => { setActiveTab('feed'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center text-xs">
          <span className="text-xl">🏠</span> Feed
        </button>
        <button onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center text-xs">
          <span className="text-xl">👤</span> Profile
        </button>
        <button onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center text-xs">
          <span className="text-xl">💬</span> Messages
        </button>
        <button onClick={resetIdentity} className="flex flex-col items-center text-xs text-red-500">
          <span className="text-xl">🔄</span> Reset
        </button>
      </nav>
    </div>
  );
}
