import { useState, useEffect } from 'react';
import { generateIdentity, hashContent, signActivity } from '@/lib/crypto';
import { initiateConnection, waitForConnection } from '@/lib/webrtc';
import { saveContent, getContent, getAllContent } from '@/lib/storage';
import { createClient } from '@supabase/supabase-js';

type Activity = { activity_id: string; author_id: string; activity_type: string; parent_id: string | null; root_id: string | null; content_hash: string; created_at: string; };
type Profile = { name: string; bio: string; avatarHash?: string; author?: string };
type DM = { text: string; sender: string; receiver: string; timestamp: number };
type Media = { type: 'image' | 'video'; data: string };

export function useSocialMesh() {
  // ---- State ----
  const [userId, setUserId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [following, setFollowing] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [sendP2P, setSendP2P] = useState<((msg: string) => void) | null>(null);
  const [feed, setFeed] = useState<Activity[]>([]);
  const [postText, setPostText] = useState('');
  const [postMedia, setPostMedia] = useState<Media | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string>('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [dmContacts, setDmContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ [contact: string]: DM[] }>({});
  const [dmInput, setDmInput] = useState('');
  const [tick, setTick] = useState(0);
  const [friends, setFriends] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<Activity[]>([]);
  const [sentRequests, setSentRequests] = useState<Activity[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [defaultPeer, setDefaultPeer] = useState<string>('');

  // ---- Helper functions ----
  function loadFollowing() {
    const saved = localStorage.getItem('following');
    if (saved) setFollowing(JSON.parse(saved));
  }
  function saveFollowing(list: string[]) {
    setFollowing(list);
    localStorage.setItem('following', JSON.stringify(list));
  }
  function loadFriends() {
    const saved = localStorage.getItem('friends');
    if (saved) setFriends(JSON.parse(saved));
  }
  function saveFriends(list: string[]) {
    setFriends(list);
    localStorage.setItem('friends', JSON.stringify(list));
  }
  function loadDefaultPeer() {
    const saved = localStorage.getItem('defaultPeer');
    if (saved) setDefaultPeer(saved);
  }
  function saveDefaultPeer(peerId: string) {
    setDefaultPeer(peerId);
    localStorage.setItem('defaultPeer', peerId);
  }

  // ---- Profile persistence ----
  async function loadMyProfile() {
    if (!userId) return;
    // Try dedicated key
    let content = getContent(`profile_${userId}`);
    if (content && content.name) {
      setMyProfile(content);
      setProfileName(content.name);
      setProfileBio(content.bio);
      setProfileAvatar(content.avatarHash || '');
      return;
    }
    // Scan all local storage
    const allContent = getAllContent();
    const profileId = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.author === userId && c.name;
    });
    if (profileId) {
      const c = allContent[profileId];
      setMyProfile(c);
      setProfileName(c.name || '');
      setProfileBio(c.bio || '');
      setProfileAvatar(c.avatarHash || '');
      saveContent(`profile_${userId}`, c);
      return;
    }
    // API fallback
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const profileActivity = data.activities?.find((a: any) => a.activity_type === 'PROFILE' && a.author_id === userId);
    if (profileActivity) {
      const c = getContent(profileActivity.activity_id);
      if (c && c.name) {
        setMyProfile(c);
        setProfileName(c.name);
        setProfileBio(c.bio);
        setProfileAvatar(c.avatarHash || '');
        saveContent(`profile_${userId}`, c);
      }
    }
  }

  async function saveProfile(name: string, bio: string, avatarBase64?: string) {
    if (!userId || !privateKey) return alert('Register first');
    const content: Profile = { name, bio, author: userId };
    if (avatarBase64) content.avatarHash = avatarBase64;
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    saveContent(`profile_${userId}`, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, type: 'PROFILE', parentId: null, rootId: null, contentHash, signature, userId })
    });
    setMyProfile(content);
    setProfileName(name);
    setProfileBio(bio);
    if (avatarBase64) setProfileAvatar(avatarBase64);
    alert('Profile saved!');
  }

  // ---- P2P functions ----
  let isInitiatorCalling = false;
  let isListenerCalling = false;

  async function startAsInitiator() {
    if (!userId || isInitiatorCalling) return;
    if (!targetId || targetId.length < 30) {
      console.warn('Invalid targetId, must be full UUID');
      return;
    }
    isInitiatorCalling = true;
    try {
      const { sendData } = await initiateConnection(userId, targetId, (data) => {
        handleP2PMessage(data, sendData);
      });
      setSendP2P(() => sendData);
      setConnected(true);
      // Request DM history and content for posts from this peer
      setTimeout(() => {
        requestDMHistory(targetId);
        feed.forEach(activity => {
          if (activity.author_id === targetId) {
            sendData(JSON.stringify({ type: 'request_content', activityId: activity.activity_id }));
          }
        });
      }, 1000);
    } catch (e) {
      console.error('Initiate connection error:', e);
    } finally {
      isInitiatorCalling = false;
    }
  }

  async function startAsListener() {
    if (!userId || isListenerCalling) return;
    isListenerCalling = true;
    try {
      const { sendData } = await waitForConnection(userId, (data) => {
        handleP2PMessage(data, sendData);
      });
      setSendP2P(() => sendData);
      setConnected(true);
    } catch (e) {
      console.error('Listen connection error:', e);
    } finally {
      isListenerCalling = false;
    }
  }

  function handleP2PMessage(data: string, sendFn: (msg: string) => void) {
    try {
      const msg = JSON.parse(data);
      console.log('P2P message received:', msg.type);
      switch (msg.type) {
        case 'request_content': {
          const content = getContent(msg.activityId);
          if (content) {
            sendFn(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content }));
          } else {
            sendFn(JSON.stringify({ type: 'content_response', activityId: msg.activityId, content: null }));
          }
          break;
        }
        case 'content_response': {
          if (msg.content) {
            saveContent(msg.activityId, msg.content);
            loadFeed();
          }
          break;
        }
        case 'new_post': {
          saveContent(msg.activityId, msg.content);
          loadFeed();
          break;
        }
        case 'request_profile': {
          if (myProfile) sendFn(JSON.stringify({ type: 'profile_response', profile: myProfile }));
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
          setDmMessages(prev => {
            const existing = prev[contact] || [];
            return { ...prev, [contact]: [...existing, msg.content] };
          });
          if (!dmContacts.includes(contact)) setDmContacts(prev => [...prev, contact]);
          break;
        }
        case 'request_dm_history': {
          const allContent = getAllContent();
          const dms = Object.keys(allContent)
            .filter(id => {
              const c = allContent[id];
              return c.sender && c.receiver && (c.sender === msg.contactId || c.receiver === msg.contactId);
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
            setDmMessages(prev => {
              const existing = prev[contact] || [];
              if (existing.find(m => m.timestamp === dm.timestamp && m.sender === dm.sender)) return prev;
              return { ...prev, [contact]: [...existing, dm] };
            });
            if (!dmContacts.includes(contact)) setDmContacts(prev => [...prev, contact]);
          });
          break;
        }
        case 'new_like': {
          saveContent(msg.activityId, msg.content);
          loadFeed();
          break;
        }
        default: console.log('Unknown P2P message type:', msg.type);
      }
    } catch (e) {
      console.error('P2P message error:', e);
    }
  }

  // ---- Follow with auto-connect ----
  async function followUser(targetUserId: string) {
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
      body: JSON.stringify({ activityId, type: 'FOLLOW', parentId: targetUserId, rootId: null, contentHash, signature, userId })
    });
    saveFollowing([...following, targetUserId]);
    loadFeed();
    // Auto-connect to the followed user (P2P)
    setTargetId(targetUserId);
    setTimeout(() => startAsInitiator(), 500);
  }

  // ---- Friend requests ----
  async function sendFriendRequest(targetUserId: string) {
    if (!userId || !privateKey) return alert('Register first');
    if (friends.includes(targetUserId)) return alert('Already friends');
    const allContent = getAllContent();
    const existingReq = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.type === 'FRIEND_REQUEST' && c.sender === userId && c.target === targetUserId;
    });
    if (existingReq) return alert('Request already sent');
    const content = { type: 'FRIEND_REQUEST', sender: userId, target: targetUserId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    const res = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'FRIEND_REQUEST',
        parentId: targetUserId,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });
    const data = await res.json();
    console.log('📤 Friend request response:', data);
    if (!res.ok) {
      console.error('Failed to send friend request:', data);
      alert('Failed to send: ' + (data.error || 'Unknown error'));
      return;
    }
    alert('Friend request sent!');
    loadFriendRequests();
    loadSentRequests();
  }

  async function acceptFriendRequest(requestId: string, senderId: string) {
    if (!userId || !privateKey) return alert('Register first');
    const content = { type: 'FRIEND_ACCEPT', sender: userId, target: senderId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    const res = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        type: 'FRIEND_ACCEPT',
        parentId: requestId,
        rootId: null,
        contentHash,
        signature,
        userId
      })
    });
    const data = await res.json();
    console.log('✅ Friend accept response:', data);
    if (!res.ok) {
      console.error('Failed to accept friend request:', data);
      alert('Failed to accept: ' + (data.error || 'Unknown error'));
      return;
    }
    const newFriends = [...friends, senderId];
    saveFriends(newFriends);
    loadFriendRequests();
    loadSentRequests();
    alert('Friend request accepted!');
  }

  // ---- Fetch functions ----
  async function loadFriendRequests() {
    if (!userId) return;
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const requests = data.activities?.filter((a: any) => 
      a.activity_type === 'FRIEND_REQUEST' && a.parent_id === userId
    ) || [];
    console.log('📥 Incoming friend requests:', requests);
    setFriendRequests(requests);
  }

  async function loadSentRequests() {
    if (!userId) return;
    const res = await fetch(`/api/feed?userId=${userId}`);
    const data = await res.json();
    const sent = data.activities?.filter((a: any) => 
      a.activity_type === 'FRIEND_REQUEST' && a.author_id === userId
    ) || [];
    console.log('📤 Sent friend requests:', sent);
    setSentRequests(sent);
  }

  function isFriendOrPending(targetUserId: string): 'friend' | 'pending' | 'none' {
    if (friends.includes(targetUserId)) return 'friend';
    const allContent = getAllContent();
    const pending = Object.keys(allContent).some(id => {
      const c = allContent[id];
      return c.type === 'FRIEND_REQUEST' && c.sender === userId && c.target === targetUserId;
    });
    return pending ? 'pending' : 'none';
  }

  // ---- Core functions ----
  async function registerIdentity() {
    try {
      const identity = await generateIdentity();
      setPublicKey(identity.publicKey);
      setPrivateKey(identity.privateKey);
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: identity.publicKey, handle: `user-${Date.now()}` })
      });
      const data = await res.json();
      if (!res.ok || !data.userId) throw new Error(data.error || 'Registration failed');
      setUserId(data.userId);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('publicKey', identity.publicKey);
      localStorage.setItem('privateKey', identity.privateKey);
      loadFollowing();
      loadFriends();
      loadDefaultPeer();
      loadFeed();
      loadMyProfile();
      loadFriendRequests();
      loadSentRequests();
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Check console.');
    }
  }

  function resetIdentity() {
    localStorage.removeItem('userId');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('following');
    localStorage.removeItem('friends');
    localStorage.removeItem('defaultPeer');
    setUserId(null);
    setFollowing([]);
    setFriends([]);
    setFeed([]);
    setConnected(false);
    setSendP2P(null);
    window.location.reload();
  }

  async function fetchUserProfile(targetUserId: string): Promise<Profile | null> {
    if (profiles[targetUserId]) return profiles[targetUserId];
    let content = getContent(`profile_${targetUserId}`);
    if (content && content.name) {
      setProfiles(prev => ({ ...prev, [targetUserId]: content }));
      return content;
    }
    const allContent = getAllContent();
    const profileId = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.author === targetUserId && c.name;
    });
    if (profileId) {
      const c = allContent[profileId];
      saveContent(`profile_${targetUserId}`, c);
      setProfiles(prev => ({ ...prev, [targetUserId]: c }));
      return c;
    }
    try {
      const res = await fetch(`/api/feed?userId=${targetUserId}`);
      const data = await res.json();
      const profileActivity = data.activities?.find((a: any) => a.activity_type === 'PROFILE' && a.author_id === targetUserId);
      if (profileActivity) {
        const c = getContent(profileActivity.activity_id);
        if (c && c.name) {
          saveContent(`profile_${targetUserId}`, c);
          setProfiles(prev => ({ ...prev, [targetUserId]: c }));
          return c;
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile for', targetUserId, e);
    }
    return null;
  }

  async function checkUserExists(identifier: string): Promise<string | null> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      let query = supabase.from('identities').select('user_id');
      if (identifier.length === 36 && identifier.includes('-')) {
        query = query.eq('user_id', identifier);
      } else {
        query = query.ilike('user_id', `${identifier}%`);
      }
      const { data, error } = await query.limit(1);
      if (error) {
        console.error('Supabase error checking user:', error);
        return null;
      }
      if (data && data.length > 0) {
        return data[0].user_id;
      }
      return null;
    } catch (e) {
      console.error('Error checking user existence:', e);
      return null;
    }
  }

  async function loadFeed() {
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
  }

  async function createPost(text: string, media?: Media) {
    const storedUserId = localStorage.getItem('userId');
    const storedPrivateKey = localStorage.getItem('privateKey');
    if (!storedUserId || !storedPrivateKey) return alert('Register first');
    if (!text.trim() && !media) return;
    const content: any = { text, timestamp: Date.now(), author: storedUserId };
    if (media) content.media = media;
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: storedUserId, contentHash, nonce: Math.random() });
    const signature = await signActivity(storedPrivateKey, activityId, contentHash);
    saveContent(activityId, content);
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, type: 'POST', parentId: null, rootId: null, contentHash, signature, userId: storedUserId })
    });
    if (sendP2P) {
      sendP2P(JSON.stringify({ type: 'new_post', activityId, content, signature }));
    }
    setPostText('');
    setPostMedia(null);
    loadFeed();
  }

  // ---- Direct Messages ----
  async function sendDM(receiver: string, text: string) {
    if (!userId || !privateKey) {
      alert('Register first');
      return;
    }
    if (!text.trim()) return;
    if (!sendP2P) {
      alert('P2P not connected. Please establish a connection first.');
      return;
    }
    const content: DM = { text, sender: userId, receiver, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, content);
    setDmMessages(prev => {
      const existing = prev[receiver] || [];
      return { ...prev, [receiver]: [...existing, content] };
    });
    try {
      sendP2P(JSON.stringify({ type: 'dm_message', activityId, content, signature }));
      console.log('DM sent via P2P to', receiver);
    } catch (e) {
      console.error('Failed to send DM via P2P:', e);
      alert('Failed to send message. Please check P2P connection.');
    }
    setDmInput('');
  }

  async function requestDMHistory(contact: string) {
    if (!sendP2P) return;
    sendP2P(JSON.stringify({ type: 'request_dm_history', contactId: contact }));
  }

  // ---- Like ----
  async function likePost(postId: string, authorId: string) {
    if (!userId || !privateKey) { alert('Register first'); return; }
    const allContent = getAllContent();
    const existingLike = Object.keys(allContent).find(id => {
      const c = allContent[id];
      return c.parentId === postId && c.action === 'LIKE' && c.sender === userId;
    });
    if (existingLike) { alert('You already liked this post'); return; }
    const content = { action: 'LIKE', target: postId, sender: userId, timestamp: Date.now() };
    const contentHash = await hashContent(content);
    const activityId = await hashContent({ author: userId, contentHash, nonce: Math.random() });
    const signature = await signActivity(privateKey, activityId, contentHash);
    saveContent(activityId, { ...content, parentId: postId });
    const res = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId, type: 'LIKE', parentId: postId, rootId: postId, contentHash, signature, userId
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Server error on like:', data);
      alert('Failed to like: ' + (data.error || 'Unknown error'));
      return;
    }
    if (sendP2P) sendP2P(JSON.stringify({ type: 'new_like', activityId, content, signature }));
    setTick(prev => prev + 1);
    loadFeed();
  }

  function hasLiked(postId: string): boolean {
    const allContent = getAllContent();
    return Object.keys(allContent).some(id => {
      const c = allContent[id];
      return c.parentId === postId && c.action === 'LIKE' && c.sender === userId;
    });
  }

  function getLikeCount(activityId: string): number {
    const allContent = getAllContent();
    return Object.keys(allContent).filter(id => {
      const c = allContent[id];
      return c.parentId === activityId && c.action === 'LIKE';
    }).length;
  }

  // ---- Add contact ----
  function addContact(contactId: string) {
    if (!contactId) return;
    setDmContacts(prev => {
      if (prev.includes(contactId)) return prev;
      return [...prev, contactId];
    });
  }

  // ---- Auto-add and select when connected ----
  useEffect(() => {
    if (connected && targetId) {
      addContact(targetId);
      if (!selectedContact) {
        setSelectedContact(targetId);
        requestDMHistory(targetId);
      }
    }
  }, [connected, targetId]);

  // ---- useEffect for initialization ----
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedPubKey = localStorage.getItem('publicKey');
    const savedPrivKey = localStorage.getItem('privateKey');
    if (savedUserId && savedPubKey && savedPrivKey) {
      setUserId(savedUserId);
      setPublicKey(savedPubKey);
      setPrivateKey(savedPrivKey);
      loadFollowing();
      loadFriends();
      loadDefaultPeer();
      loadFeed();
      loadMyProfile();
      loadFriendRequests();
      loadSentRequests();
      setTimeout(() => {
        startAsListener();
        if (defaultPeer) {
          setTargetId(defaultPeer);
          setTimeout(() => startAsInitiator(), 1500);
        }
      }, 1000);
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      localStorage.removeItem('following');
      localStorage.removeItem('friends');
      setUserId(null);
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel('activities-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
        loadFeed();
        loadFriendRequests();
        loadSentRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ---- Return ----
  return {
    userId,
    publicKey,
    privateKey,
    following,
    targetId,
    connected,
    sendP2P,
    feed,
    postText,
    setPostText,
    postMedia,
    setPostMedia,
    profileName,
    setProfileName,
    profileBio,
    setProfileBio,
    profileAvatar,
    setProfileAvatar,
    myProfile,
    dmContacts,
    selectedContact,
    dmMessages,
    dmInput,
    setDmInput,
    setTargetId,
    setSelectedContact,
    friends,
    friendRequests,
    sentRequests,
    profiles,
    defaultPeer,
    saveDefaultPeer,
    addContact,
    registerIdentity,
    resetIdentity,
    loadMyProfile,
    fetchUserProfile,
    checkUserExists,
    saveProfile,
    loadFeed,
    createPost,
    followUser,
    sendDM,
    requestDMHistory,
    startAsInitiator,
    startAsListener,
    getLikeCount,
    likePost,
    hasLiked,
    tick,
    sendFriendRequest,
    acceptFriendRequest,
    loadFriendRequests,
    loadSentRequests,
    isFriendOrPending,
  };
}
