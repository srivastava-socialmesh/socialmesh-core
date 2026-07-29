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

type Profile = {
  name: string;
  bio: string;
  avatarHash?: string;
};

type DM = {
  text: string;
  sender: string;
  receiver: string;
  timestamp: number;
};

// --- Main Component ---
export default function Home() {
  // Identity state
  const [userId, setUserId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [following, setFollowing] = useState<string[]>([]);

  // P2P state
  const [targetId, setTargetId] = useState('');
  const [connected, setConnected] = useState(false);
  const [sendP2P, setSendP2P] = useState<((msg: string) => void) | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages'>('feed');
  const [feed, setFeed] = useState<Activity[]>([]);
  const [postText, setPostText] = useState('');

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  // DM state
  const [dmContacts, setDmContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ [contact: string]: DM[] }>({});
  const [dmInput, setDmInput] = useState('');

  // --- Core Functions ---

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

  // --- Profile ---

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
    // First check local cache
    const allContent = getAllContent();
    const profileId = Object.keys(allContent).find(id => 
      allContent[id].author === targetUserId && allContent[id].name !== undefined
    );
    if (profileId) return allContent[profileId];

    // Request via P2P if connected
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
        // Send request
        sendP2P(JSON.stringify({ type: 'request_profile', userId: targetUserId }));
        // Timeout after 3s
        setTimeout(() => resolve(null), 3000);
      });
    }
    return null;
  };

  // --- Feed & Posts ---

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

  // --- Following ---

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

  // --- Direct Messaging ---

  // Send a DM via P2P
  const sendDM = async (receiver: string, text: string) => {
    if (!userId || !privateKey) return alert('Register first');
    if (!text.trim()) return;
    if (!sendP2P) return alert('P2P not connected');

    const content: DM = { text, sender: userId, receiver, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);

    // Store locally
    saveContent(activityId, content);

    // Send via P2P
    sendP2P(JSON.stringify({ type: 'dm_message', activityId, content, signature }));

    // Update local UI
    setDmMessages(prev => ({
      ...prev,
      [receiver]: [...(prev[receiver] || []), content]
    }));
    setDmInput('');
  };

  // Request DM history from a peer
  const requestDMHistory = async (contact: string) => {
    if (!sendP2P) return;
    sendP2P(JSON.stringify({ type: 'request_dm_history', contactId: contact }));
  };

  // --- P2P Message Handler (extended) ---

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
          // Send my profile back
          const profile = getMyProfile();
          if (profile) {
            sendFn(JSON.stringify({ type: 'profile_response', profile }));
          }
          break;
        }

        case 'profile_response': {
          // Save profile from peer (we'll store it in a special key)
          const profileId = `profile_${Date.now()}`;
          saveContent(profileId, { ...msg.profile, author: targetId });
          alert('Profile received!');
          break;
        }

        case 'dm_message': {
          // Store incoming DM
          saveContent(msg.activityId, msg.content);
          const contact = msg.content.sender;
          setDmMessages(prev => ({
            ...prev,
            [contact]: [...(prev[contact] || []), msg.content]
          }));
          // Auto-add to contacts
          if (!dmContacts.includes(contact)) {
            setDmContacts(prev => [...prev, contact]);
          }
          break;
        }

        case 'request_dm_history': {
          // Send all DMs where this user is the sender or receiver
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
          // Store received DM history
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

  // Helper to get my profile content
  const getMyProfile = (): Profile | null => {
    if (!myProfile) return null;
    return myProfile;
  };

  // --- P2P Connection ---

  const startAsInitiator = async () => {
    if (!userId) return alert('Register first');
    const { sendData } = await initiateConnection(userId, targetId, (data) => {
      handleP2PMessage(data, sendData);
    });
    setSendP2P(() => sendData);
    setConnected(true);
    // Auto-request DM history
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

  // --- Tabs ---

  const renderFeed = () => (
    <>
      <div className="border p-4 my-4">
        <h2 className="font-bold">Create Post</h2>
        <textarea
          className="border w-full p-2 text-black"
          rows={3}
          value={postText}
          onChange={e => setPostText(e.target.value)}
        />
        <button onClick={createPost} className="bg-green-500 text-white px-4 py-2 rounded">
          Post
        </button>
      </div>
      <div>
        {feed.map((activity) => {
          const content = getContent(activity.activity_id);
          const isFollowing = following.includes(activity.author_id);
          return (
            <div key={activity.activity_id} className="border p-4 my-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">👤 {activity.author_id.slice(0,8)}</span>
                <button
                  onClick={() => followUser(activity.author_id)}
                  className={`text-xs px-2 py-1 rounded ${isFollowing ? 'bg-gray-300 text-black' : 'bg-blue-500 text-white'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
              <div className="my-2">{content ? content.text : 'Loading...'}</div>
              {!content && sendP2P && (
                <button
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
                  onClick={() => {
                    sendP2P(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
                  }}
                >
                  Fetch P2P
                </button>
              )}
              <div className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderProfile = () => (
    <div className="border p-4 my-4">
      <h2 className="font-bold">Edit Profile</h2>
      <input
        className="border w-full p-2 my-2 text-black"
        placeholder="Display Name"
        value={profileName}
        onChange={e => setProfileName(e.target.value)}
      />
      <textarea
        className="border w-full p-2 my-2 text-black"
        placeholder="Bio"
        rows={3}
        value={profileBio}
        onChange={e => setProfileBio(e.target.value)}
      />
      <button onClick={saveProfile} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Profile
      </button>
      {myProfile && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-black">
          <p><strong>Name:</strong> {myProfile.name}</p>
          <p><strong>Bio:</strong> {myProfile.bio}</p>
        </div>
      )}
    </div>
  );

  const renderMessages = () => (
    <div className="border p-4 my-4">
      <h2 className="font-bold">Direct Messages</h2>
      <div className="flex gap-2 my-2">
        <input
          placeholder="Paste contact User ID"
          className="border p-2 flex-1 text-black"
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
        />
        <button onClick={startAsInitiator} className="bg-green-500 text-white px-4 py-2 rounded">
          Connect
        </button>
        <button onClick={startAsListener} className="bg-orange-500 text-white px-4 py-2 rounded">
          Listen
        </button>
      </div>
      {connected && <div className="text-green-600">✅ P2P Connected</div>}

      <div className="flex gap-4 my-4">
        <div className="w-1/3 border-r pr-2">
          <h3 className="font-bold">Contacts</h3>
          {dmContacts.length === 0 && <p className="text-gray-500">No contacts yet</p>}
          {dmContacts.map(contact => (
            <div
              key={contact}
              className={`p-2 cursor-pointer ${selectedContact === contact ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => {
                setSelectedContact(contact);
                requestDMHistory(contact);
              }}
            >
              {contact.slice(0,8)}...
            </div>
          ))}
        </div>
        <div className="w-2/3">
          {selectedContact ? (
            <>
              <h3 className="font-bold">Chat with {selectedContact.slice(0,8)}...</h3>
              <div className="border h-48 overflow-y-scroll p-2 my-2 bg-gray-50 text-black">
                {(dmMessages[selectedContact] || []).map((dm, idx) => (
                  <div key={idx} className={`mb-1 ${dm.sender === userId ? 'text-right' : 'text-left'}`}>
                    <span className="bg-blue-200 px-2 py-1 rounded">
                      {dm.sender === userId ? 'You' : 'Them'}: {dm.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="border p-2 flex-1 text-black"
                  placeholder="Type a message..."
                  value={dmInput}
                  onChange={e => setDmInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendDM(selectedContact, dmInput)}
                />
                <button onClick={() => sendDM(selectedContact, dmInput)} className="bg-blue-500 text-white px-4 py-2 rounded">
                  Send
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Select a contact to chat</p>
          )}
        </div>
      </div>
    </div>
  );

  // --- Initialisation ---

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

    // Supabase Realtime
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

  // --- UI ---

  if (!userId) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">SocialMesh</h1>
        <button onClick={registerIdentity} className="bg-blue-500 text-white px-4 py-2 rounded my-4">
          Register New Identity
        </button>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">SocialMesh</h1>
        <div className="flex gap-2">
          <span className="text-sm">👤 {userId.slice(0,8)}...</span>
          <button onClick={resetIdentity} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            Reset
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'feed' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Feed
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'messages' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
      </div>

      {activeTab === 'feed' && renderFeed()}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'messages' && renderMessages()}

      {/* P2P Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 text-black text-sm p-2 text-center border-t">
        P2P: {connected ? '✅ Connected' : '❌ Disconnected'}
        {connected && ` | Peer: ${targetId.slice(0,8)}...`}
      </div>
    </main>
  );
}
